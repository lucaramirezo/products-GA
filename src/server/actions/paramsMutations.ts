"use server";

import { getDb } from '@/db/client';
import { priceParams, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { PriceParams } from '@/lib/pricing/types';

export async function updateParams(patch: Partial<PriceParams>): Promise<PriceParams> {
  const db = getDb();

    // Get current params for audit (singleton record with id=1)
    const [currentParams] = await db.select().from(priceParams).where(eq(priceParams.id, 1));
    
    // Prepare update data - transform from frontend types to DB types
    const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
    
    if (patch.ink_price !== undefined) updateData.inkPrice = patch.ink_price.toString();
    if (patch.lamination_price !== undefined) updateData.laminationPrice = patch.lamination_price.toString();
    if (patch.cut_price !== undefined) updateData.cutPrice = patch.cut_price.toString();
    if (patch.rounding_step !== undefined) updateData.roundingStep = patch.rounding_step.toString();
    if (patch.cost_method !== undefined) updateData.costMethod = patch.cost_method;
    
    let updatedParams;
    
    if (currentParams) {
      // Update existing params
      [updatedParams] = await db
        .update(priceParams)
        .set(updateData)
        .where(eq(priceParams.id, 1))
        .returning();
    } else {
      // Insert new params if none exist (with defaults)
      const insertData = {
        id: 1,
        inkPrice: patch.ink_price?.toString() ?? '0.55',
        laminationPrice: patch.lamination_price?.toString() ?? '0',
        cutPrice: patch.cut_price?.toString() ?? '0',
        roundingStep: patch.rounding_step?.toString() ?? '0.05',
        costMethod: patch.cost_method ?? 'latest',
        defaultTier: 1 // Default tier
      };
      
      [updatedParams] = await db.insert(priceParams).values(insertData).returning();
    }

    // Create audit entries for changed fields
    const auditEntries = [];
    for (const [field, newValue] of Object.entries(patch)) {
      const dbField = fieldMap[field as keyof PriceParams];
      if (dbField && currentParams) {
                const oldValue = currentParams ? (currentParams as Record<string, unknown>)[dbField] : null;
        if (oldValue !== newValue) {
          auditEntries.push({
            entity: 'params',
            entityId: '1',
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
    const result: PriceParams = {
      ink_price: Number(updatedParams.inkPrice),
      lamination_price: Number(updatedParams.laminationPrice),
      cut_price: Number(updatedParams.cutPrice),
      rounding_step: Number(updatedParams.roundingStep),
      cost_method: updatedParams.costMethod as "latest"
    };

    revalidatePath('/');
    return result;
}

// Field mapping for audit trail
const fieldMap: Partial<Record<keyof PriceParams, string>> = {
  ink_price: 'inkPrice',
  lamination_price: 'laminationPrice',
  cut_price: 'cutPrice',
  rounding_step: 'roundingStep',
  cost_method: 'costMethod'
};
