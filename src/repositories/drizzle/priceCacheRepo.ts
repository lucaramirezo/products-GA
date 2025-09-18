import { eq } from 'drizzle-orm';
import { priceCache } from '../../db/schema';
import type { DrizzleDb } from '../../db/types';

// Keep breakdown loosely typed but explicit; matches PriceBreakdown structure keys as string map
export interface CachedPriceEntry {
  inputsHash: string;
  sku: string;
  finalPvp: number;
  breakdown: Record<string, unknown>;
  computedAt?: Date | null;
}

export class DrizzlePriceCacheRepo {
  constructor(private db: DrizzleDb) {}

  async get(hash: string): Promise<CachedPriceEntry | undefined> {
    const rows = await this.db.select().from(priceCache).where(eq(priceCache.inputsHash, hash)).limit(1);
    const r = rows[0];
    if (!r) return undefined;
    return {
      inputsHash: r.inputsHash,
      sku: r.sku,
      finalPvp: Number(r.finalPvp),
      breakdown: r.breakdown,
      computedAt: r.computedAt ?? null
    };
  }

  async set(entry: CachedPriceEntry): Promise<void> {
    await this.db
      .insert(priceCache)
      .values({
        inputsHash: entry.inputsHash,
        sku: entry.sku,
        finalPvp: String(entry.finalPvp),
        breakdown: entry.breakdown,
        computedAt: entry.computedAt ?? new Date()
      })
      .onConflictDoUpdate({
        target: priceCache.inputsHash,
        set: {
          sku: entry.sku,
          finalPvp: String(entry.finalPvp),
          breakdown: entry.breakdown,
          computedAt: entry.computedAt ?? new Date()
        }
      });
  }

  async invalidate(hash: string): Promise<void> {
    await this.db.delete(priceCache).where(eq(priceCache.inputsHash, hash));
  }

  async clearForSku(sku: string): Promise<void> {
    await this.db.delete(priceCache).where(eq(priceCache.sku, sku));
  }
}
