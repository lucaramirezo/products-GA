import { PurchasesRepo, ProductsRepo, ProvidersRepo, AuditRepo } from '@/repositories/interfaces';
import { Purchase, PurchaseItem, CreatePurchaseInput, CreatePurchaseItemInput } from '@/lib/purchases/types';
import { calculateCostPerSqft } from '@/lib/purchases/calculations';
import { createQuickProduct, QuickProductInput } from '@/server/actions/quickProductActions';

export class PurchaseService {
  constructor(
    private purchasesRepo: PurchasesRepo,
    private productsRepo: ProductsRepo,
    private providersRepo: ProvidersRepo,
    private auditRepo: AuditRepo
  ) {}

  
  private async handleProductCreation(items: CreatePurchaseItemInput[]) {
    // Get the first available provider as default
    const providers = await this.providersRepo.list();
    const defaultProvider = providers.length > 0 ? providers[0].id : 'default';
    
    for (const item of items) {
      if (item.linkingMode === 'create' && item.newProductCategory && item.newProductArea) {
        try {
          const productInput = {
            name: item.name,
            category: item.newProductCategory,
            providerId: defaultProvider, // Use actual provider
            area_sqft: item.newProductArea,
            cost_sqft: item.amount / (item.qty * item.newProductArea), // Calculate cost per sq ft
            sell_mode: 'SQFT' as const
          };

          const newProduct = await createQuickProduct(productInput);
          
          // Update the item to link to the newly created product
          item.productId = newProduct.sku; // Use SKU as ID since that's how products are identified
          item.linked = true;
          
          // Log the product creation
          console.log(`Product created from purchase: ${newProduct.name} (SKU: ${newProduct.sku})`);
        } catch (error) {
          // Log error but continue with unlinking (user can fix manually)
          console.error('Error creating product from purchase:', error);
          item.linkingMode = 'none'; // Fall back to unlinked
          item.linked = false;
        }
      } else if (item.linkingMode === 'existing' && item.productId) {
        // Product is already linked, just ensure linked flag is set
        item.linked = true;
      } else {
        // linkingMode === 'none' or incomplete data
        item.linked = false;
      }
    }
  }

  async save(dto: CreatePurchaseInput): Promise<Purchase> {
    // Validate purchase data
    this.validatePurchaseInput(dto);

    // Handle product creation for items that need it
    await this.handleProductCreation(dto.items);

    // Validate items (after potential product creation)
    await this.validatePurchaseItems(dto.items);

    // Create purchase and items
    const purchase = await this.purchasesRepo.create(
      {
        supplierId: dto.supplierId,
        invoiceNo: dto.invoiceNo,
        date: dto.date,
        currency: dto.currency || 'USD',
        notes: dto.notes
      },
      dto.items.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        areaSqft: item.areaSqft,
        unitPrice: item.unitPrice,
        amount: item.amount,
        linked: item.linked || false,
        appliedToProduct: item.appliedToProduct || false,
        tempWidth: item.tempWidth,
        tempHeight: item.tempHeight,
        tempUom: item.tempUom
      }))
    );

    // Apply cost updates to products if requested
    await this.applyProductCostUpdates(dto.items, purchase.id);

    return purchase;
  }

  private validatePurchaseInput(dto: CreatePurchaseInput): void {
    if (!dto.date) {
      throw new Error('La fecha de compra es requerida');
    }

    if (dto.date > new Date()) {
      throw new Error('La fecha de compra no puede ser futura');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new Error('La compra debe tener al menos un artículo');
    }

    // Filter out empty items
    const validItems = dto.items.filter(item => item.name.trim() && item.qty > 0);
    if (validItems.length === 0) {
      throw new Error('La compra debe tener al menos un artículo válido');
    }
  }

  private async validatePurchaseItems(items: CreatePurchaseItemInput[]): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Skip empty items
      if (!item.name.trim()) continue;

      // Basic validations
      if (item.qty <= 0) {
        throw new Error(`Artículo ${i + 1}: La cantidad debe ser mayor a 0`);
      }

      if (item.amount < 0) {
        throw new Error(`Artículo ${i + 1}: El monto no puede ser negativo`);
      }

      // Unit-specific validations
      if (item.unit === 'sheet') {
        await this.validateSheetItem(item, i + 1);
      }

      // Product validation if linked
      if (item.linked && item.productId) {
        const product = await this.productsRepo.getBySku(item.productId);
        if (!product) {
          throw new Error(`Artículo ${i + 1}: El producto ${item.productId} no existe`);
        }
      }

      // Cost calculation validation
      const costPerSqft = await this.calculateItemCostPerSqft(item);
      if (item.appliedToProduct && costPerSqft === null) {
        throw new Error(`Artículo ${i + 1}: No se puede calcular el costo por pie² para aplicar al producto`);
      }
    }
  }

  private async validateSheetItem(item: CreatePurchaseItemInput, itemNumber: number): Promise<void> {
    if (!item.productId && (!item.tempWidth || !item.tempHeight || !item.tempUom)) {
      throw new Error(
        `Artículo ${itemNumber}: Para unidad 'hoja' sin producto vinculado se requieren las dimensiones temporales (ancho, alto, unidad)`
      );
    }

    if (item.tempWidth && item.tempWidth <= 0) {
      throw new Error(`Artículo ${itemNumber}: El ancho debe ser mayor a 0`);
    }

    if (item.tempHeight && item.tempHeight <= 0) {
      throw new Error(`Artículo ${itemNumber}: El alto debe ser mayor a 0`);
    }

    if (item.tempUom && !['in', 'cm'].includes(item.tempUom)) {
      throw new Error(`Artículo ${itemNumber}: La unidad de medida debe ser 'in' o 'cm'`);
    }

    // If linked to product, check that product has valid area
    if (item.productId) {
      const product = await this.productsRepo.getBySku(item.productId);
      if (product && product.area_sqft <= 0) {
        throw new Error(
          `Artículo ${itemNumber}: El producto ${item.productId} no tiene un área válida para cálculo de hojas`
        );
      }
    }

    // Validate that area calculation won't be zero
    const costPerSqft = await this.calculateItemCostPerSqft(item);
    if (item.qty > 0 && item.amount > 0 && costPerSqft === null) {
      throw new Error(
        `Artículo ${itemNumber}: Error en cálculo de área - verifique las dimensiones`
      );
    }
  }

  private async calculateItemCostPerSqft(item: CreatePurchaseItemInput): Promise<number | null> {
    if (item.productId) {
      const product = await this.productsRepo.getBySku(item.productId);
      return calculateCostPerSqft(item, product?.area_sqft);
    }
    
    return calculateCostPerSqft(item);
  }

  private async applyProductCostUpdates(items: CreatePurchaseItemInput[], purchaseId?: string): Promise<void> {
    const auditEntries = [];

    for (const item of items) {
      if (item.appliedToProduct && item.linked && item.productId) {
        const product = await this.productsRepo.getBySku(item.productId);
        if (!product) {
          console.error(`Product ${item.productId} not found for cost update`);
          continue;
        }

        const newCostSqft = await this.calculateItemCostPerSqft(item);
        if (newCostSqft === null) {
          console.error(`Could not calculate cost per sqft for item ${item.name}`);
          continue;
        }

        const oldCostSqft = product.cost_sqft;

        try {
          // Update product cost
          await this.productsRepo.updatePartial(item.productId, {
            cost_sqft: newCostSqft
          });

          // Prepare enhanced audit entry with purchase context
          const auditBefore = {
            cost_sqft: oldCostSqft,
            source: 'manual'
          };

          const auditAfter = {
            cost_sqft: newCostSqft,
            source: 'purchase',
            purchase_id: purchaseId,
            item_name: item.name,
            quantity: item.qty,
            area_sqft_per_unit: item.areaSqft,
            unit_price: item.unitPrice,
            cost_ft2_line: newCostSqft
          };

          auditEntries.push({
            entity: 'products',
            id: item.productId,
            field: 'cost_sqft',
            before: auditBefore,
            after: auditAfter,
            date: new Date().toISOString(),
            user: 'system' // TODO: Get actual user from session
          });

          console.log(`Updated product ${item.productId} cost from ${oldCostSqft} to ${newCostSqft} (from purchase ${purchaseId})`);
        } catch (error) {
          console.error(`Error updating product ${item.productId} cost:`, error);
          throw new Error(`Error al actualizar el costo del producto ${item.productId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    }

    // Write audit entries
    if (auditEntries.length > 0) {
      try {
        await this.auditRepo.insert(auditEntries);
      } catch (error) {
        console.error('Error writing audit entries:', error);
        // Don't throw here - the purchase was successful, audit is secondary
      }
    }
  }

  async list(options?: { 
    limit?: number; 
    offset?: number; 
    search?: string; 
    supplierId?: string; 
    dateFrom?: Date; 
    dateTo?: Date 
  }) {
    return this.purchasesRepo.list(options);
  }

  async getById(id: string) {
    return this.purchasesRepo.getById(id);
  }

  async updatePurchase(id: string, patch: Partial<Purchase>) {
    return this.purchasesRepo.update(id, patch);
  }

  async updatePurchaseWithItems(
    id: string, 
    purchase: Partial<Purchase>, 
    items?: CreatePurchaseItemInput[]
  ) {
    // Handle product creation for items that need it
    if (items) {
      await this.handleProductCreation(items);
      
      // Validate items (after potential product creation)
      await this.validatePurchaseItems(items);
    }

    // Update purchase
    const updatedPurchase = await this.purchasesRepo.updateWithItems(
      id, 
      purchase, 
      items?.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        areaSqft: item.areaSqft,
        unitPrice: item.unitPrice,
        amount: item.amount,
        linked: item.linked || false,
        appliedToProduct: item.appliedToProduct || false,
        tempWidth: item.tempWidth,
        tempHeight: item.tempHeight,
        tempUom: item.tempUom
      }))
    );

    // Apply cost updates to products if requested
    if (items) {
      await this.applyProductCostUpdates(items, id);
    }

    return updatedPurchase;
  }

  async deletePurchase(id: string) {
    return this.purchasesRepo.delete(id);
  }
}