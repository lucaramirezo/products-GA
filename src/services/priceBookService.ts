import { PriceBookRepository, ProductsRepo } from '@/repositories/interfaces';
import { PriceEntry } from '@/lib/types/purchase';

export class PriceBookService {
  constructor(
    private priceBookRepo: PriceBookRepository,
    private productsRepo: ProductsRepo
  ) {}

  async setPinned(productId: string, entryId: string): Promise<void> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    // Validate that the entry exists and belongs to this product
    const entry = await this.priceBookRepo.getById(entryId);
    if (!entry || !entry.active || entry.deletedAt) {
      throw new Error('Entrada de precio no encontrada o inactiva');
    }

    if (entry.productId !== productId) {
      throw new Error('La entrada de precio no pertenece al producto especificado');
    }

    // Pin the entry (this will unpin others automatically)
    await this.priceBookRepo.pinEntry(productId, entryId);
  }

  async unsetPinned(productId: string, entryId: string): Promise<void> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    // Validate that the entry exists and belongs to this product
    const entry = await this.priceBookRepo.getById(entryId);
    if (!entry || !entry.active || entry.deletedAt) {
      throw new Error('Entrada de precio no encontrada o inactiva');
    }

    if (entry.productId !== productId) {
      throw new Error('La entrada de precio no pertenece al producto especificado');
    }

    // Unpin the entry
    await this.priceBookRepo.unpinEntry(productId, entryId);
  }

  async resolveCurrent(productId: string): Promise<PriceEntry | null> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    return this.priceBookRepo.resolveCurrent(productId);
  }

  async getCurrentCost(productId: string): Promise<number | null> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    return this.priceBookRepo.resolveCurrentCost(productId);
  }

  async listPriceHistory(productId: string): Promise<PriceEntry[]> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    return this.priceBookRepo.listByProduct(productId);
  }

  async createPriceEntry(data: {
    productId: string;
    supplierId?: string;
    effectiveDate: Date;
    costFt2: number;
    currency: string;
    notes?: string;
    pinned?: boolean;
  }): Promise<PriceEntry> {
    // Validate that the product exists
    const product = await this.productsRepo.getBySku(data.productId);
    if (!product || !product.active || product.deleted_at) {
      throw new Error('Producto no encontrado o inactivo');
    }

    // Business validation
    if (data.costFt2 < 0) {
      throw new Error('El costo por pie cuadrado no puede ser negativo');
    }

    if (data.effectiveDate > new Date()) {
      throw new Error('La fecha efectiva no puede ser futura');
    }

    if (!data.currency || data.currency.trim().length === 0) {
      throw new Error('La moneda es requerida');
    }

    // Create the entry
    const entry = await this.priceBookRepo.createEntry({
      productId: data.productId,
      supplierId: data.supplierId,
      sourceItemId: undefined, // Manual entries don't have source items
      effectiveDate: data.effectiveDate,
      costFt2: data.costFt2,
      currency: data.currency.trim().toUpperCase(),
      pinned: data.pinned ?? false,
      active: true,
      notes: data.notes?.trim()
    });

    // If this entry should be pinned, pin it
    if (data.pinned) {
      await this.priceBookRepo.pinEntry(data.productId, entry.id);
    }

    return entry;
  }

  async updatePriceEntry(entryId: string, patch: {
    supplierId?: string;
    effectiveDate?: Date;
    costFt2?: number;
    currency?: string;
    notes?: string;
    active?: boolean;
  }): Promise<PriceEntry> {
    // Validate that the entry exists
    const existing = await this.priceBookRepo.getById(entryId);
    if (!existing || existing.deletedAt) {
      throw new Error('Entrada de precio no encontrada');
    }

    // Business validation for updated fields
    if (patch.costFt2 !== undefined && patch.costFt2 < 0) {
      throw new Error('El costo por pie cuadrado no puede ser negativo');
    }

    if (patch.effectiveDate !== undefined && patch.effectiveDate > new Date()) {
      throw new Error('La fecha efectiva no puede ser futura');
    }

    if (patch.currency !== undefined && (!patch.currency || patch.currency.trim().length === 0)) {
      throw new Error('La moneda es requerida');
    }

    // Prepare the update
    const updateData: Partial<PriceEntry> = {};
    if (patch.supplierId !== undefined) updateData.supplierId = patch.supplierId;
    if (patch.effectiveDate !== undefined) updateData.effectiveDate = patch.effectiveDate;
    if (patch.costFt2 !== undefined) updateData.costFt2 = patch.costFt2;
    if (patch.currency !== undefined) updateData.currency = patch.currency.trim().toUpperCase();
    if (patch.notes !== undefined) updateData.notes = patch.notes?.trim();
    if (patch.active !== undefined) updateData.active = patch.active;

    return this.priceBookRepo.updateEntry(entryId, updateData);
  }

  async deletePriceEntry(entryId: string): Promise<void> {
    // Validate that the entry exists
    const existing = await this.priceBookRepo.getById(entryId);
    if (!existing || existing.deletedAt) {
      throw new Error('Entrada de precio no encontrada');
    }

    return this.priceBookRepo.softDelete(entryId);
  }

  async activatePriceEntry(entryId: string): Promise<void> {
    return this.priceBookRepo.activateEntry(entryId);
  }

  async deactivatePriceEntry(entryId: string): Promise<void> {
    return this.priceBookRepo.deactivateEntry(entryId);
  }
}