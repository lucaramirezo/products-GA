import { PurchasesRepository } from '../interfaces';
import { 
  Purchase, PurchaseItem, PurchaseWithItems, CreatePurchaseDTO, 
  PaginationParams, PurchaseFilters, Supplier 
} from '@/lib/types/purchase';

export class MemoryPurchasesRepository implements PurchasesRepository {
  private purchases: Purchase[] = [];
  private items: PurchaseItem[] = [];
  private suppliers: Supplier[] = [];

  constructor(initialPurchases: Purchase[] = [], initialItems: PurchaseItem[] = [], initialSuppliers: Supplier[] = []) {
    this.purchases = initialPurchases;
    this.items = initialItems;
    this.suppliers = initialSuppliers;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveItems(purchaseId: string): PurchaseItem[] {
    return this.items.filter(item => 
      item.purchaseId === purchaseId && 
      item.active && 
      !item.deletedAt
    );
  }

  private getActivePurchases(): Purchase[] {
    return this.purchases.filter(p => p.active && !p.deletedAt);
  }

  private applyFilters(purchases: Purchase[], filters?: PurchaseFilters): Purchase[] {
    if (!filters) return purchases;

    return purchases.filter(p => {
      if (filters.supplierId && p.supplierId !== filters.supplierId) return false;
      if (filters.invoiceNo && !p.invoiceNo.toLowerCase().includes(filters.invoiceNo.toLowerCase())) return false;
      if (filters.dateFrom && p.date < filters.dateFrom) return false;
      if (filters.dateTo && p.date > filters.dateTo) return false;
      return true;
    });
  }

  private applyPagination<T>(items: T[], pagination?: PaginationParams): { items: T[]; total: number } {
    const total = items.length;
    if (!pagination) return { items, total };

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const offset = (page - 1) * limit;
    
    return {
      items: items.slice(offset, offset + limit),
      total
    };
  }

  private enrichWithItems(purchase: Purchase): PurchaseWithItems {
    const items = this.getActiveItems(purchase.id);
    const supplier = this.suppliers.find(s => s.id === purchase.supplierId);
    
    return {
      ...purchase,
      items,
      supplier
    };
  }

  async list(filters?: PurchaseFilters, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    const activePurchases = this.getActivePurchases();
    const filtered = this.applyFilters(activePurchases, filters);
    const { items: paginatedPurchases, total } = this.applyPagination(filtered, pagination);
    
    const enriched = paginatedPurchases.map(p => this.enrichWithItems(p));
    
    return { purchases: enriched, total };
  }

  async getById(id: string): Promise<PurchaseWithItems | null> {
    const purchase = this.purchases.find(p => p.id === id && p.active && !p.deletedAt);
    if (!purchase) return null;
    
    return this.enrichWithItems(purchase);
  }

  async create(dto: CreatePurchaseDTO): Promise<PurchaseWithItems> {
    const now = new Date().toISOString();
    const purchaseId = this.generateId();
    
    const purchase: Purchase = {
      id: purchaseId,
      invoiceNo: dto.invoiceNo,
      supplierId: dto.supplierId,
      date: dto.date,
      currency: dto.currency,
      subtotal: dto.subtotal,
      tax: dto.tax,
      shipping: dto.shipping,
      notes: dto.notes,
      attachments: dto.attachments,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    this.purchases.push(purchase);

    // Create items
    const items: PurchaseItem[] = dto.items.map(itemDto => ({
      id: this.generateId(),
      purchaseId,
      productId: itemDto.productId,
      unitType: itemDto.unitType,
      units: itemDto.units,
      width: itemDto.width,
      height: itemDto.height,
      uom: itemDto.uom,
      unitCost: itemDto.unitCost,
      generatePrice: itemDto.generatePrice,
      active: true,
      createdAt: now,
      updatedAt: now,
      // Computed fields - in memory we need to calculate these
      areaFt2PerUnit: this.calculateAreaFt2PerUnit(itemDto),
      areaFt2Total: this.calculateAreaFt2Total(itemDto),
      totalCost: itemDto.units * itemDto.unitCost
    }));

    // Calculate cost_ft2_line for each item
    items.forEach(item => {
      if (item.areaFt2Total && item.areaFt2Total > 0) {
        item.costFt2Line = item.totalCost! / item.areaFt2Total;
      }
    });

    this.items.push(...items);

    return this.enrichWithItems(purchase);
  }

  private calculateAreaFt2PerUnit(item: { unitType: string; width?: number; height?: number; uom: string }): number | undefined {
    if (item.unitType === 'sqft') {
      return 1;
    }
    
    if (item.unitType === 'sheet' && item.width && item.height) {
      const widthFt = this.convertToFeet(item.width, item.uom);
      const heightFt = this.convertToFeet(item.height, item.uom);
      return widthFt * heightFt;
    }
    
    // For rolls, area calculation would depend on business rules
    return undefined;
  }

  private calculateAreaFt2Total(item: { unitType: string; units: number; width?: number; height?: number; uom: string }): number | undefined {
    const perUnit = this.calculateAreaFt2PerUnit(item);
    return perUnit ? perUnit * item.units : undefined;
  }

  private convertToFeet(value: number, uom: string): number {
    switch (uom) {
      case 'ft': return value;
      case 'in': return value / 12;
      case 'm': return value * 3.28084;
      case 'cm': return value * 0.0328084;
      default: return value;
    }
  }

  async update(id: string, patch: Partial<Purchase>): Promise<Purchase> {
    const index = this.purchases.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Compra no encontrada');

    const updated = {
      ...this.purchases[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.purchases[index] = updated;
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const purchase = this.purchases.find(p => p.id === id);
    if (!purchase) return;

    purchase.deletedAt = new Date().toISOString();
    purchase.active = false;

    // Also soft delete associated items
    this.items.forEach(item => {
      if (item.purchaseId === id) {
        item.deletedAt = new Date().toISOString();
        item.active = false;
      }
    });
  }

  async findByDateRange(from: Date, to: Date, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    return this.list({ dateFrom: from, dateTo: to }, pagination);
  }

  async findBySupplier(supplierId: string, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    return this.list({ supplierId }, pagination);
  }

  async findByInvoiceNo(invoiceNo: string): Promise<PurchaseWithItems | null> {
    const purchase = this.purchases.find(p => 
      p.invoiceNo === invoiceNo && 
      p.active && 
      !p.deletedAt
    );
    
    if (!purchase) return null;
    return this.enrichWithItems(purchase);
  }

  async addItem(purchaseId: string, itemData: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseItem> {
    const purchase = await this.getById(purchaseId);
    if (!purchase) throw new Error('Compra no encontrada');

    const now = new Date().toISOString();
    const item: PurchaseItem = {
      ...itemData,
      id: this.generateId(),
      purchaseId,
      createdAt: now,
      updatedAt: now,
      // Calculate derived fields
      areaFt2PerUnit: this.calculateAreaFt2PerUnit(itemData),
      areaFt2Total: this.calculateAreaFt2Total({
        unitType: itemData.unitType,
        units: itemData.units,
        width: itemData.width,
        height: itemData.height,
        uom: itemData.uom
      }),
      totalCost: itemData.units * itemData.unitCost
    };

    if (item.areaFt2Total && item.areaFt2Total > 0) {
      item.costFt2Line = item.totalCost! / item.areaFt2Total;
    }

    this.items.push(item);
    return item;
  }

  async updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem> {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index === -1) throw new Error('Item de compra no encontrado');

    const updated = {
      ...this.items[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    // Recalculate derived fields if relevant fields changed
    if ('units' in patch || 'unitCost' in patch || 'width' in patch || 'height' in patch || 'unitType' in patch || 'uom' in patch) {
      updated.areaFt2PerUnit = this.calculateAreaFt2PerUnit(updated);
      updated.areaFt2Total = this.calculateAreaFt2Total(updated);
      updated.totalCost = updated.units * updated.unitCost;
      
      if (updated.areaFt2Total && updated.areaFt2Total > 0) {
        updated.costFt2Line = updated.totalCost / updated.areaFt2Total;
      }
    }

    this.items[index] = updated;
    return updated;
  }

  async deleteItem(itemId: string): Promise<void> {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    item.deletedAt = new Date().toISOString();
    item.active = false;
  }
}