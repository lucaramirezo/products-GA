import { and, eq, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DrizzleDb } from '@/db/types';
import { PurchasesRepository } from '../interfaces';
import { 
  Purchase, PurchaseItem, PurchaseWithItems, CreatePurchaseDTO, 
  PaginationParams, PurchaseFilters 
} from '@/lib/types/purchase';
import { purchases, purchaseItems, suppliers } from '@/db/schema';
import { mapPurchase, mapPurchaseItem, mapSupplier } from './mappers';

export class DrizzlePurchasesRepository implements PurchasesRepository {
  constructor(private db: DrizzleDb) {}

  private buildWhereConditions(filters?: PurchaseFilters) {
    const conditions = [
      eq(purchases.active, true),
      isNull(purchases.deletedAt)
    ];

    if (filters?.supplierId) {
      conditions.push(eq(purchases.supplierId, filters.supplierId));
    }
    
    if (filters?.invoiceNo) {
      conditions.push(sql`${purchases.invoiceNo} ILIKE ${`%${filters.invoiceNo}%`}`);
    }
    
    if (filters?.dateFrom) {
      conditions.push(gte(purchases.date, filters.dateFrom));
    }
    
    if (filters?.dateTo) {
      conditions.push(lte(purchases.date, filters.dateTo));
    }

    return conditions;
  }

  private async enrichWithItems(purchase: Purchase): Promise<PurchaseWithItems> {
    // Get items
    const itemRows = await this.db
      .select()
      .from(purchaseItems)
      .where(
        and(
          eq(purchaseItems.purchaseId, purchase.id),
          eq(purchaseItems.active, true),
          isNull(purchaseItems.deletedAt)
        )
      )
      .orderBy(purchaseItems.createdAt);
    
    const items = itemRows.map(mapPurchaseItem);

    // Get supplier
    let supplier = undefined;
    if (purchase.supplierId) {
      const supplierRow = await this.db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, purchase.supplierId))
        .limit(1);
      
      if (supplierRow.length > 0) {
        supplier = mapSupplier(supplierRow[0]);
      }
    }

    return {
      ...purchase,
      items,
      supplier
    };
  }

  async list(filters?: PurchaseFilters, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    const whereConditions = this.buildWhereConditions(filters);
    
    // Get all purchases matching filters (for counting)
    const allRows = await this.db
      .select()
      .from(purchases)
      .where(and(...whereConditions));
    
    const total = allRows.length;

    // Get paginated results
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const purchaseRows = await this.db
      .select()
      .from(purchases)
      .where(and(...whereConditions))
      .orderBy(desc(purchases.date), desc(purchases.createdAt))
      .limit(limit)
      .offset(offset);

    const purchasesList = purchaseRows.map(mapPurchase);
    
    // Enrich with items and suppliers
    const enriched = await Promise.all(
      purchasesList.map((p: Purchase) => this.enrichWithItems(p))
    );

    return { purchases: enriched, total };
  }

  async getById(id: string): Promise<PurchaseWithItems | null> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.id, id),
          eq(purchases.active, true),
          isNull(purchases.deletedAt)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;
    
    const purchase = mapPurchase(rows[0]);
    return this.enrichWithItems(purchase);
  }

  async create(dto: CreatePurchaseDTO): Promise<PurchaseWithItems> {
    // Insert purchase
    const purchaseRows = await this.db
      .insert(purchases)
      .values({
        invoiceNo: dto.invoiceNo,
        supplierId: dto.supplierId,
        date: dto.date,
        currency: dto.currency,
        subtotal: dto.subtotal.toString(),
        tax: dto.tax.toString(),
        shipping: dto.shipping.toString(),
        notes: dto.notes,
        attachments: dto.attachments
      })
      .returning();

    const purchase = mapPurchase(purchaseRows[0]);

    // Insert items - let DB triggers compute derived fields
    if (dto.items.length > 0) {
      await this.db
        .insert(purchaseItems)
        .values(
          dto.items.map(item => ({
            purchaseId: purchase.id,
            productId: item.productId,
            unitType: item.unitType,
            units: item.units.toString(),
            width: item.width?.toString(),
            height: item.height?.toString(),
            uom: item.uom,
            unitCost: item.unitCost.toString(),
            generatePrice: item.generatePrice
          }))
        );
    }

    return this.enrichWithItems(purchase);
  }

  async update(id: string, patch: Partial<Purchase>): Promise<Purchase> {
    const updateData: Record<string, unknown> = {};
    
    if (patch.invoiceNo !== undefined) updateData.invoiceNo = patch.invoiceNo;
    if (patch.supplierId !== undefined) updateData.supplierId = patch.supplierId;
    if (patch.date !== undefined) updateData.date = patch.date;
    if (patch.currency !== undefined) updateData.currency = patch.currency;
    if (patch.subtotal !== undefined) updateData.subtotal = patch.subtotal.toString();
    if (patch.tax !== undefined) updateData.tax = patch.tax.toString();
    if (patch.shipping !== undefined) updateData.shipping = patch.shipping.toString();
    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.attachments !== undefined) updateData.attachments = patch.attachments;
    if (patch.active !== undefined) updateData.active = patch.active;

    const rows = await this.db
      .update(purchases)
      .set(updateData)
      .where(eq(purchases.id, id))
      .returning();

    if (rows.length === 0) throw new Error('Compra no encontrada');
    
    return mapPurchase(rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    // Soft delete purchase
    await this.db
      .update(purchases)
      .set({ 
        active: false, 
        deletedAt: sql`NOW()` 
      })
      .where(eq(purchases.id, id));

    // Soft delete associated items
    await this.db
      .update(purchaseItems)
      .set({ 
        active: false, 
        deletedAt: sql`NOW()` 
      })
      .where(eq(purchaseItems.purchaseId, id));
  }

  async findByDateRange(from: Date, to: Date, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    return this.list({ dateFrom: from, dateTo: to }, pagination);
  }

  async findBySupplier(supplierId: string, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }> {
    return this.list({ supplierId }, pagination);
  }

  async findByInvoiceNo(invoiceNo: string): Promise<PurchaseWithItems | null> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.invoiceNo, invoiceNo),
          eq(purchases.active, true),
          isNull(purchases.deletedAt)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;
    
    const purchase = mapPurchase(rows[0]);
    return this.enrichWithItems(purchase);
  }

  async addItem(purchaseId: string, itemData: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseItem> {
    // Verify purchase exists
    const purchase = await this.getById(purchaseId);
    if (!purchase) throw new Error('Compra no encontrada');

    const rows = await this.db
      .insert(purchaseItems)
      .values({
        purchaseId,
        productId: itemData.productId,
        unitType: itemData.unitType,
        units: itemData.units.toString(),
        width: itemData.width?.toString(),
        height: itemData.height?.toString(),
        uom: itemData.uom,
        unitCost: itemData.unitCost.toString(),
        generatePrice: itemData.generatePrice,
        active: itemData.active
      })
      .returning();

    return mapPurchaseItem(rows[0]);
  }

  async updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem> {
    const updateData: Record<string, unknown> = {};
    
    if (patch.productId !== undefined) updateData.productId = patch.productId;
    if (patch.unitType !== undefined) updateData.unitType = patch.unitType;
    if (patch.units !== undefined) updateData.units = patch.units.toString();
    if (patch.width !== undefined) updateData.width = patch.width?.toString();
    if (patch.height !== undefined) updateData.height = patch.height?.toString();
    if (patch.uom !== undefined) updateData.uom = patch.uom;
    if (patch.unitCost !== undefined) updateData.unitCost = patch.unitCost.toString();
    if (patch.generatePrice !== undefined) updateData.generatePrice = patch.generatePrice;
    if (patch.active !== undefined) updateData.active = patch.active;

    const rows = await this.db
      .update(purchaseItems)
      .set(updateData)
      .where(eq(purchaseItems.id, itemId))
      .returning();

    if (rows.length === 0) throw new Error('Item de compra no encontrado');
    
    return mapPurchaseItem(rows[0]);
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.db
      .update(purchaseItems)
      .set({ 
        active: false, 
        deletedAt: sql`NOW()` 
      })
      .where(eq(purchaseItems.id, itemId));
  }
}