import { PurchasesRepository, PriceBookRepository } from '@/repositories/interfaces';
import { 
  CreatePurchaseDTO, CreatePurchaseItemDTO, PurchaseWithItems, PurchaseItem, PriceEntry,
  PurchaseFilters, PaginationParams
} from '@/lib/types/purchase';

export class PurchaseService {
  constructor(
    private purchasesRepo: PurchasesRepository,
    private priceBookRepo: PriceBookRepository
  ) {}

  async savePurchase(dto: CreatePurchaseDTO): Promise<PurchaseWithItems> {
    // Validation
    this.validatePurchaseDTO(dto);

    // Create the purchase with items (triggers will compute derived fields)
    const purchase = await this.purchasesRepo.create(dto);

    // Generate price entries for items where generate_price = true
    const priceEntries: PriceEntry[] = [];
    
    for (const item of purchase.items) {
      if (item.generatePrice && item.productId && item.costFt2Line) {
        try {
          const priceEntry = await this.priceBookRepo.createEntry({
            productId: item.productId,
            supplierId: purchase.supplierId,
            sourceItemId: item.id,
            effectiveDate: purchase.date,
            costFt2: item.costFt2Line,
            currency: purchase.currency,
            pinned: false, // Don't auto-pin new entries
            active: true,
            notes: `Generado automáticamente desde compra ${purchase.invoiceNo}, item ${item.id}`
          });
          
          priceEntries.push(priceEntry);
        } catch (error) {
          console.error(`Error creando entrada de precio para producto ${item.productId}:`, error);
          // Continue processing other items even if one fails
        }
      }
    }

    console.log(`Compra ${purchase.id} guardada con ${priceEntries.length} entradas de precio generadas`);
    
    return purchase;
  }

  private validatePurchaseDTO(dto: CreatePurchaseDTO): void {
    if (!dto.invoiceNo?.trim()) {
      throw new Error('Número de factura es requerido');
    }

    if (!dto.supplierId?.trim()) {
      throw new Error('Proveedor es requerido');
    }

    if (!dto.date) {
      throw new Error('Fecha es requerida');
    }

    if (dto.date > new Date()) {
      throw new Error('La fecha de compra no puede ser futura');
    }

    if (dto.subtotal < 0) {
      throw new Error('El subtotal no puede ser negativo');
    }

    if (dto.tax < 0) {
      throw new Error('El impuesto no puede ser negativo');
    }

    if (dto.shipping < 0) {
      throw new Error('El costo de envío no puede ser negativo');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new Error('La compra debe tener al menos un item');
    }

    // Validate each item
    dto.items.forEach((item, index) => {
      this.validatePurchaseItem(item, index);
    });

    // Business validation: Check if invoice number already exists
    // This should be done async, but we'll handle it in the repository layer
  }

  private validatePurchaseItem(item: CreatePurchaseItemDTO, index: number): void {
    const itemPrefix = `Item ${index + 1}:`;

    if (!item.unitType) {
      throw new Error(`${itemPrefix} Tipo de unidad es requerido`);
    }

    if (!['sheet', 'roll', 'sqft'].includes(item.unitType)) {
      throw new Error(`${itemPrefix} Tipo de unidad debe ser 'sheet', 'roll' o 'sqft'`);
    }

    if (!item.units || item.units <= 0) {
      throw new Error(`${itemPrefix} Cantidad debe ser mayor a 0`);
    }

    if (!item.uom) {
      throw new Error(`${itemPrefix} Unidad de medida es requerida`);
    }

    if (!['ft', 'in', 'm', 'cm'].includes(item.uom)) {
      throw new Error(`${itemPrefix} Unidad de medida debe ser 'ft', 'in', 'm' o 'cm'`);
    }

    if (item.unitCost < 0) {
      throw new Error(`${itemPrefix} Costo unitario no puede ser negativo`);
    }

    // Validate dimensions for sheet items
    if (item.unitType === 'sheet') {
      if (!item.width || item.width <= 0) {
        throw new Error(`${itemPrefix} Ancho es requerido y debe ser mayor a 0 para items tipo 'sheet'`);
      }
      if (!item.height || item.height <= 0) {
        throw new Error(`${itemPrefix} Alto es requerido y debe ser mayor a 0 para items tipo 'sheet'`);
      }
    }

    // Validate product exists if productId is provided
    if (item.productId && item.generatePrice) {
      // This validation should ideally check if the product exists
      // For now we'll rely on the database foreign key constraint
    }
  }

  async getPurchaseById(id: string): Promise<PurchaseWithItems | null> {
    return this.purchasesRepo.getById(id);
  }

  async getPurchaseByInvoice(invoiceNo: string): Promise<PurchaseWithItems | null> {
    return this.purchasesRepo.findByInvoiceNo(invoiceNo);
  }

  async listPurchases(filters?: PurchaseFilters, pagination?: PaginationParams) {
    return this.purchasesRepo.list(filters, pagination);
  }

  async updatePurchase(id: string, patch: Partial<CreatePurchaseDTO>) {
    // Additional validation could be added here
    return this.purchasesRepo.update(id, patch);
  }

  async deletePurchase(id: string): Promise<void> {
    return this.purchasesRepo.softDelete(id);
  }

  async addItemToPurchase(purchaseId: string, itemData: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseItem> {
    this.validatePurchaseItem(itemData, 0);
    return this.purchasesRepo.addItem(purchaseId, itemData);
  }

  async updatePurchaseItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem> {
    // Additional validation could be added here
    return this.purchasesRepo.updateItem(itemId, patch);
  }

  async deletePurchaseItem(itemId: string): Promise<void> {
    return this.purchasesRepo.deleteItem(itemId);
  }
}