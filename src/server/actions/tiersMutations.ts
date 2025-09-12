"use server";

import { getDb } from '@/db/client';
import { tiers, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Tier } from '@/lib/pricing/types';

export async function updateTier(id: number, patch: Partial<Tier>): Promise<Tier> {
  const db = getDb();

    // Get current tier for audit
    const [currentTier] = await db.select().from(tiers).where(eq(tiers.id, id));
    
    if (!currentTier) {
      throw new Error(`Tier not found: ${id}`);
    }

    // Prepare update data - transform from frontend types to DB types
    const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
    
    if (patch.mult !== undefined) updateData.mult = patch.mult.toString();
    if (patch.number_of_layers !== undefined) updateData.numberOfLayers = patch.number_of_layers;

    // Update the tier
    const [updatedTier] = await db
      .update(tiers)
      .set(updateData)
      .where(eq(tiers.id, id))
      .returning();

    // Create audit entries for changed fields
    const auditEntries = [];
    for (const [field, newValue] of Object.entries(patch)) {
      const dbField = fieldMap[field as keyof Tier];
      if (dbField) {
        const oldValue = (currentTier as Record<string, unknown>)[dbField];
        if (oldValue !== newValue) {
          auditEntries.push({
            entity: 'tier',
            entityId: id.toString(),
            field: field,
            before: oldValue,
            after: newValue,
            userId: 'admin' // TODO: Get from session
          });
        }
      }
    }

    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(auditEntries);
    }

    // Transform back to frontend type
    const result: Tier = {
      id: updatedTier.id,
      mult: Number(updatedTier.mult),
      number_of_layers: updatedTier.numberOfLayers
    };

    revalidatePath('/');
    return result;
}

export async function upsertTiers(tiersList: Tier[]): Promise<Tier[]> {
  const db = getDb();

    const results = [];
    
    for (const tier of tiersList) {
      const insertData = {
        id: tier.id,
        mult: tier.mult.toString(),
        numberOfLayers: tier.number_of_layers
      };

      // Use upsert pattern (insert with conflict resolution)
      const [upsertedTier] = await db
        .insert(tiers)
        .values(insertData)
        .onConflictDoUpdate({
          target: tiers.id,
          set: {
            mult: insertData.mult,
            numberOfLayers: insertData.numberOfLayers
          }
        })
        .returning();

      results.push({
        id: upsertedTier.id,
        mult: Number(upsertedTier.mult),
        number_of_layers: upsertedTier.numberOfLayers
      });

      // Log the change
      await db.insert(auditLog).values({
        entity: 'tier',
        entityId: tier.id.toString(),
        field: 'upsert',
        before: null,
        after: JSON.stringify(tier),
        userId: 'admin'
      });
    }

    revalidatePath('/');
    return results;
}

// Field mapping for audit trail
const fieldMap: Record<keyof Tier, string> = {
  id: 'id',
  mult: 'mult',
  number_of_layers: 'numberOfLayers'
};
