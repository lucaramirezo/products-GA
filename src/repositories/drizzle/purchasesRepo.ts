import { PurchasesRepo } from '../interfaces';
import { Purchase, PurchaseItem, PurchaseWithDetails } from '@/lib/purchases/types';
import { getDb } from '@/db/client';
import { purchases, purchaseItems, providers } from '@/db/schema';
import { eq, desc, and, gte, lte, like, or, count, sql, inArray } from 'drizzle-orm';

export class DrizzlePurchasesRepo implements PurchasesRepo {
  async list(options?: { 
    limit?: number; 
    offset?: number; 
    search?: string; 
    supplierId?: string; 
    dateFrom?: Date; 
    dateTo?: Date 
  }): Promise<{ purchases: PurchaseWithDetails[]; total: number }> {
    const db = getDb();
    
    // Build where conditions
    const conditions = [];
    
    if (options?.supplierId) {
      conditions.push(eq(purchases.supplierId, options.supplierId));
    }
    
    if (options?.dateFrom) {
      conditions.push(gte(purchases.date, options.dateFrom));
    }
    
    if (options?.dateTo) {
      conditions.push(lte(purchases.date, options.dateTo));
    }
    
    if (options?.search) {
      conditions.push(
        or(
          like(purchases.invoiceNo, `%${options.search}%`),
          like(purchases.notes, `%${options.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(purchases)
      .where(whereClause);
    
    const total = totalResult.count;

    // Get purchases with supplier info
    const result = await db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        invoiceNo: purchases.invoiceNo,
        date: purchases.date,
        currency: purchases.currency,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
        updatedAt: purchases.updatedAt,
        supplierName: providers.name
      })
      .from(purchases)
      .leftJoin(providers, eq(purchases.supplierId, providers.id))
      .where(whereClause)
      .orderBy(desc(purchases.date))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    // Get items for all purchases in this page
    const purchaseIds = result.map(p => p.id);
    const items = purchaseIds.length > 0 
      ? await db
          .select()
          .from(purchaseItems)
          .where(inArray(purchaseItems.purchaseId, purchaseIds))
      : [];

    // Build purchases with details
    const purchasesWithDetails: PurchaseWithDetails[] = result.map(purchase => {
      const purchaseItemsFiltered = items.filter(item => item.purchaseId === purchase.id);
      const totalAmount = purchaseItemsFiltered.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      return {
        id: purchase.id,
        supplierId: purchase.supplierId || undefined,
        invoiceNo: purchase.invoiceNo || undefined,
        date: purchase.date,
        currency: purchase.currency || undefined,
        notes: purchase.notes || undefined,
        createdAt: purchase.createdAt!,
        updatedAt: purchase.updatedAt!,
        supplierName: purchase.supplierName || undefined,
        items: purchaseItemsFiltered.map(item => ({
          id: item.id,
          purchaseId: item.purchaseId,
          productId: item.productId || undefined,
          name: item.name,
          qty: parseFloat(item.qty),
          unit: item.unit as 'sqft' | 'sheet',
          unitPrice: parseFloat(item.unitPrice),
          amount: parseFloat(item.amount),
          areaSqft: item.areaSqft ? parseFloat(item.areaSqft) : undefined,
          linked: item.linked,
          appliedToProduct: item.appliedToProduct,
          tempWidth: item.tempWidth ? parseFloat(item.tempWidth) : undefined,
          tempHeight: item.tempHeight ? parseFloat(item.tempHeight) : undefined,
          tempUom: item.tempUom || undefined,
          createdAt: item.createdAt!,
          updatedAt: item.updatedAt!
        })),
        totalAmount,
        itemsCount: purchaseItemsFiltered.length
      };
    });

    return { purchases: purchasesWithDetails, total };
  }

  async getById(id: string): Promise<PurchaseWithDetails | null> {
    const db = getDb();
    
    // Get purchase with supplier info
    const [purchase] = await db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        invoiceNo: purchases.invoiceNo,
        date: purchases.date,
        currency: purchases.currency,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
        updatedAt: purchases.updatedAt,
        supplierName: providers.name
      })
      .from(purchases)
      .leftJoin(providers, eq(purchases.supplierId, providers.id))
      .where(eq(purchases.id, id));

    if (!purchase) return null;

    // Get items
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, id));

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return {
      id: purchase.id,
      supplierId: purchase.supplierId || undefined,
      invoiceNo: purchase.invoiceNo || undefined,
      date: purchase.date,
      currency: purchase.currency || undefined,
      notes: purchase.notes || undefined,
      createdAt: purchase.createdAt!,
      updatedAt: purchase.updatedAt!,
      supplierName: purchase.supplierName || undefined,
      items: items.map(item => ({
        id: item.id,
        purchaseId: item.purchaseId,
        productId: item.productId || undefined,
        name: item.name,
        qty: parseFloat(item.qty),
        unit: item.unit as 'sqft' | 'sheet',
        unitPrice: parseFloat(item.unitPrice),
        amount: parseFloat(item.amount),
        areaSqft: item.areaSqft ? parseFloat(item.areaSqft) : undefined,
        linked: item.linked,
        appliedToProduct: item.appliedToProduct,
        tempWidth: item.tempWidth ? parseFloat(item.tempWidth) : undefined,
        tempHeight: item.tempHeight ? parseFloat(item.tempHeight) : undefined,
        tempUom: item.tempUom || undefined,
        createdAt: item.createdAt!,
        updatedAt: item.updatedAt!
      })),
      totalAmount,
      itemsCount: items.length
    };
  }

  async create(
    purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>, 
    items: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Purchase> {
    const db = getDb();

    return await db.transaction(async (tx) => {
      // Create purchase
      const [newPurchase] = await tx
        .insert(purchases)
        .values({
          supplierId: purchase.supplierId || null,
          invoiceNo: purchase.invoiceNo || null,
          date: purchase.date,
          currency: purchase.currency || null,
          notes: purchase.notes || null
        })
        .returning();

      // Create items
      if (items.length > 0) {
        await tx
          .insert(purchaseItems)
          .values(items.map(item => ({
            purchaseId: newPurchase.id,
            productId: item.productId || null,
            name: item.name,
            qty: item.qty.toString(),
            unit: item.unit,
            areaSqft: item.areaSqft?.toString() || null,
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
            linked: item.linked,
            appliedToProduct: item.appliedToProduct,
            tempWidth: item.tempWidth?.toString() || null,
            tempHeight: item.tempHeight?.toString() || null,
            tempUom: item.tempUom || null
          })));
      }

      return {
        id: newPurchase.id,
        supplierId: newPurchase.supplierId || undefined,
        invoiceNo: newPurchase.invoiceNo || undefined,
        date: newPurchase.date,
        currency: newPurchase.currency || undefined,
        notes: newPurchase.notes || undefined,
        createdAt: newPurchase.createdAt!,
        updatedAt: newPurchase.updatedAt!
      };
    });
  }

  async update(id: string, patch: Partial<Purchase>): Promise<Purchase> {
    const db = getDb();
    
    const [updated] = await db
      .update(purchases)
      .set({
        supplierId: patch.supplierId || null,
        invoiceNo: patch.invoiceNo || null,
        date: patch.date,
        currency: patch.currency || null,
        notes: patch.notes || null,
        updatedAt: new Date()
      })
      .where(eq(purchases.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Compra con ID ${id} no encontrada`);
    }

    return {
      id: updated.id,
      supplierId: updated.supplierId || undefined,
      invoiceNo: updated.invoiceNo || undefined,
      date: updated.date,
      currency: updated.currency || undefined,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!
    };
  }

  async updateWithItems(
    id: string, 
    purchase: Partial<Purchase>, 
    items?: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Purchase> {
    const db = getDb();

    return await db.transaction(async (tx) => {
      // Update purchase
      const [updated] = await tx
        .update(purchases)
        .set({
          supplierId: purchase.supplierId || null,
          invoiceNo: purchase.invoiceNo || null,
          date: purchase.date,
          currency: purchase.currency || null,
          notes: purchase.notes || null,
          updatedAt: new Date()
        })
        .where(eq(purchases.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Compra con ID ${id} no encontrada`);
      }

      // If items are provided, replace all items
      if (items) {
        // Delete existing items
        await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));

        // Insert new items
        if (items.length > 0) {
          await tx.insert(purchaseItems).values(
            items.map(item => ({
              purchaseId: id,
              productId: item.productId || null,
              name: item.name,
              qty: item.qty.toString(),
              unit: item.unit,
              unitPrice: item.unitPrice.toString(),
              amount: item.amount.toString(),
              areaSqft: item.areaSqft?.toString() || null,
              linked: item.linked,
              appliedToProduct: item.appliedToProduct,
              tempWidth: item.tempWidth?.toString() || null,
              tempHeight: item.tempHeight?.toString() || null,
              tempUom: item.tempUom || null
            }))
          );
        }
      }

      // Return full purchase with updated data
      const fullPurchase = await this.getById(id);
      if (!fullPurchase) {
        throw new Error(`Compra con ID ${id} no encontrada después de actualizar`);
      }
      return fullPurchase;
    });
  }

  async addItem(
    purchaseId: string, 
    item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>
  ): Promise<PurchaseItem> {
    const db = getDb();
    
    const [newItem] = await db
      .insert(purchaseItems)
      .values({
        purchaseId,
        productId: item.productId || null,
        name: item.name,
        qty: item.qty.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        amount: item.amount.toString(),
        linked: item.linked,
        appliedToProduct: item.appliedToProduct,
        tempWidth: item.tempWidth?.toString() || null,
        tempHeight: item.tempHeight?.toString() || null,
        tempUom: item.tempUom || null
      })
      .returning();

    return {
      id: newItem.id,
      purchaseId: newItem.purchaseId,
      productId: newItem.productId || undefined,
      name: newItem.name,
      qty: parseFloat(newItem.qty),
      unit: newItem.unit as 'sqft' | 'sheet',
      unitPrice: parseFloat(newItem.unitPrice),
      amount: parseFloat(newItem.amount),
      linked: newItem.linked,
      appliedToProduct: newItem.appliedToProduct,
      tempWidth: newItem.tempWidth ? parseFloat(newItem.tempWidth) : undefined,
      tempHeight: newItem.tempHeight ? parseFloat(newItem.tempHeight) : undefined,
      tempUom: newItem.tempUom || undefined,
      createdAt: newItem.createdAt!,
      updatedAt: newItem.updatedAt!
    };
  }

  async updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem> {
    const db = getDb();
    
    const [updated] = await db
      .update(purchaseItems)
      .set({
        productId: patch.productId || null,
        name: patch.name,
        qty: patch.qty?.toString(),
        unit: patch.unit,
        amount: patch.amount?.toString(),
        linked: patch.linked,
        appliedToProduct: patch.appliedToProduct,
        tempWidth: patch.tempWidth?.toString() || null,
        tempHeight: patch.tempHeight?.toString() || null,
        tempUom: patch.tempUom || null,
        updatedAt: new Date()
      })
      .where(eq(purchaseItems.id, itemId))
      .returning();

    if (!updated) {
      throw new Error(`Artículo con ID ${itemId} no encontrado`);
    }

    return {
      id: updated.id,
      purchaseId: updated.purchaseId,
      productId: updated.productId || undefined,
      name: updated.name,
      qty: parseFloat(updated.qty),
      unit: updated.unit as 'sqft' | 'sheet',
      unitPrice: parseFloat(updated.unitPrice),
      amount: parseFloat(updated.amount),
      linked: updated.linked,
      appliedToProduct: updated.appliedToProduct,
      tempWidth: updated.tempWidth ? parseFloat(updated.tempWidth) : undefined,
      tempHeight: updated.tempHeight ? parseFloat(updated.tempHeight) : undefined,
      tempUom: updated.tempUom || undefined,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!
    };
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    
    await db.transaction(async (tx) => {
      // First delete all items
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      
      // Then delete the purchase
      const result = await tx.delete(purchases).where(eq(purchases.id, id));
      
      if (result.rowCount === 0) {
        throw new Error(`Compra con ID ${id} no encontrada`);
      }
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    const db = getDb();
    
    const result = await db
      .delete(purchaseItems)
      .where(eq(purchaseItems.id, itemId));

    if (result.rowCount === 0) {
      throw new Error(`Artículo con ID ${itemId} no encontrado`);
    }
  }
}