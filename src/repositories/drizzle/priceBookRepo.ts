import { and, eq, desc, sql, isNull } from 'drizzle-orm';
import type { DrizzleDb } from '@/db/types';
import { PriceBookRepository } from '../interfaces';
import { PriceEntry } from '@/lib/types/purchase';
import { priceEntries, products } from '@/db/schema';
import { mapPriceEntry } from './mappers';

export class DrizzlePriceBookRepository implements PriceBookRepository {
  constructor(private db: DrizzleDb) {}

  async listByProduct(productId: string): Promise<PriceEntry[]> {
    const rows = await this.db
      .select()
      .from(priceEntries)
      .where(
        and(
          eq(priceEntries.productId, productId),
          eq(priceEntries.active, true),
          isNull(priceEntries.deletedAt)
        )
      )
      .orderBy(desc(priceEntries.effectiveDate), desc(priceEntries.createdAt));

    return rows.map(mapPriceEntry);
  }

  async getById(id: string): Promise<PriceEntry | null> {
    const rows = await this.db
      .select()
      .from(priceEntries)
      .where(
        and(
          eq(priceEntries.id, id),
          eq(priceEntries.active, true),
          isNull(priceEntries.deletedAt)
        )
      )
      .limit(1);

    return rows.length > 0 ? mapPriceEntry(rows[0]) : null;
  }

  async createEntry(entryData: Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceEntry> {
    const rows = await this.db
      .insert(priceEntries)
      .values({
        productId: entryData.productId,
        supplierId: entryData.supplierId,
        sourceItemId: entryData.sourceItemId,
        effectiveDate: entryData.effectiveDate,
        costFt2: entryData.costFt2.toString(),
        currency: entryData.currency,
        pinned: entryData.pinned,
        active: entryData.active,
        notes: entryData.notes
      })
      .returning();

    return mapPriceEntry(rows[0]);
  }

  async updateEntry(id: string, patch: Partial<PriceEntry>): Promise<PriceEntry> {
    const updateData: Record<string, unknown> = {};

    if (patch.supplierId !== undefined) updateData.supplierId = patch.supplierId;
    if (patch.sourceItemId !== undefined) updateData.sourceItemId = patch.sourceItemId;
    if (patch.effectiveDate !== undefined) updateData.effectiveDate = patch.effectiveDate;
    if (patch.costFt2 !== undefined) updateData.costFt2 = patch.costFt2.toString();
    if (patch.currency !== undefined) updateData.currency = patch.currency;
    if (patch.pinned !== undefined) updateData.pinned = patch.pinned;
    if (patch.active !== undefined) updateData.active = patch.active;
    if (patch.notes !== undefined) updateData.notes = patch.notes;

    const rows = await this.db
      .update(priceEntries)
      .set(updateData)
      .where(eq(priceEntries.id, id))
      .returning();

    if (rows.length === 0) throw new Error('Entrada de precio no encontrada');
    
    return mapPriceEntry(rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(priceEntries)
      .set({ 
        active: false, 
        deletedAt: sql`NOW()` 
      })
      .where(eq(priceEntries.id, id));
  }

  async pinEntry(productId: string, entryId: string): Promise<void> {
    // First unpin all entries for this product
    await this.unpinAllForProduct(productId);

    // Then pin the specified entry
    const rows = await this.db
      .update(priceEntries)
      .set({ pinned: true })
      .where(
        and(
          eq(priceEntries.id, entryId),
          eq(priceEntries.productId, productId)
        )
      )
      .returning();

    if (rows.length === 0) throw new Error('Entrada de precio no encontrada');

    // Update the product's current_price_entry_id
    await this.db
      .update(products)
      .set({ currentPriceEntryId: entryId })
      .where(eq(products.sku, productId));
  }

  async unpinEntry(productId: string, entryId: string): Promise<void> {
    const rows = await this.db
      .update(priceEntries)
      .set({ pinned: false })
      .where(
        and(
          eq(priceEntries.id, entryId),
          eq(priceEntries.productId, productId)
        )
      )
      .returning();

    if (rows.length === 0) throw new Error('Entrada de precio no encontrada');

    // Clear the product's current_price_entry_id if this was the pinned entry
    await this.db
      .update(products)
      .set({ currentPriceEntryId: null })
      .where(eq(products.sku, productId));
  }

  async unpinAllForProduct(productId: string): Promise<void> {
    // Unpin all entries for this product
    await this.db
      .update(priceEntries)
      .set({ pinned: false })
      .where(eq(priceEntries.productId, productId));

    // Clear the product's current_price_entry_id
    await this.db
      .update(products)
      .set({ currentPriceEntryId: null })
      .where(eq(products.sku, productId));
  }

  async activateEntry(id: string): Promise<void> {
    await this.db
      .update(priceEntries)
      .set({ 
        active: true, 
        deletedAt: null 
      })
      .where(eq(priceEntries.id, id));
  }

  async deactivateEntry(id: string): Promise<void> {
    await this.db
      .update(priceEntries)
      .set({ active: false })
      .where(eq(priceEntries.id, id));
  }

  async resolveCurrent(productId: string): Promise<PriceEntry | null> {
    // This leverages the products_with_cost view logic
    // First, look for pinned entries
    const pinnedRows = await this.db
      .select()
      .from(priceEntries)
      .where(
        and(
          eq(priceEntries.productId, productId),
          eq(priceEntries.pinned, true),
          eq(priceEntries.active, true),
          isNull(priceEntries.deletedAt)
        )
      )
      .limit(1);

    if (pinnedRows.length > 0) {
      return mapPriceEntry(pinnedRows[0]);
    }

    // If no pinned entry, get the latest by effective date
    const latestRows = await this.db
      .select()
      .from(priceEntries)
      .where(
        and(
          eq(priceEntries.productId, productId),
          eq(priceEntries.active, true),
          isNull(priceEntries.deletedAt)
        )
      )
      .orderBy(desc(priceEntries.effectiveDate))
      .limit(1);

    return latestRows.length > 0 ? mapPriceEntry(latestRows[0]) : null;
  }

  async resolveCurrentCost(productId: string): Promise<number | null> {
    const currentEntry = await this.resolveCurrent(productId);
    return currentEntry ? currentEntry.costFt2 : null;
  }
}