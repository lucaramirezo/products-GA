"use server";

import { createDbClient } from '@/db/client';
import { categoryRules, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { CategoryRule } from '@/lib/pricing/types';

export async function upsertCategoryRule(rule: CategoryRule): Promise<CategoryRule> {
  const { client, db } = createDbClient();
  
  try {
    await client.connect();

    // Get current rule for audit
    const [currentRule] = await db.select().from(categoryRules).where(eq(categoryRules.category, rule.category));

    const insertData = {
      category: rule.category,
      minPvp: rule.min_pvp?.toString(),
      overrideMultiplier: rule.override_multiplier?.toString(),
      overrideInkFactor: rule.override_ink_factor
    };

    // Use upsert pattern (insert with conflict resolution)
    const [upsertedRule] = await db
      .insert(categoryRules)
      .values(insertData)
      .onConflictDoUpdate({
        target: categoryRules.category,
        set: {
          minPvp: insertData.minPvp,
          overrideMultiplier: insertData.overrideMultiplier,
          overrideInkFactor: insertData.overrideInkFactor
        }
      })
      .returning();

    // Create audit entries for changed fields
    const auditEntries = [];
    for (const [field, newValue] of Object.entries(rule)) {
      if (field === 'category') continue; // Skip primary key
      
      const dbField = fieldMap[field as keyof CategoryRule];
      if (dbField) {
        const oldValue = currentRule ? (currentRule as Record<string, unknown>)[dbField] : null;
        if (oldValue !== newValue) {
          auditEntries.push({
            entity: 'category_rule',
            entityId: rule.category,
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
    const result: CategoryRule = {
      category: upsertedRule.category,
      min_pvp: upsertedRule.minPvp ? Number(upsertedRule.minPvp) : undefined,
      override_multiplier: upsertedRule.overrideMultiplier ? Number(upsertedRule.overrideMultiplier) : undefined,
      override_ink_factor: upsertedRule.overrideInkFactor ?? undefined
    };

    revalidatePath('/');
    return result;

  } finally {
    await client.end();
  }
}

export async function deleteCategoryRule(category: string): Promise<void> {
  const { client, db } = createDbClient();
  
  try {
    await client.connect();

    // Get current rule for audit
    const [currentRule] = await db.select().from(categoryRules).where(eq(categoryRules.category, category));

    await db.delete(categoryRules).where(eq(categoryRules.category, category));

    // Log deletion
    await db.insert(auditLog).values({
      entity: 'category_rule',
      entityId: category,
      field: 'delete',
      before: currentRule ? JSON.stringify(currentRule) : null,
      after: 'deleted',
      userId: 'admin'
    });

    revalidatePath('/');

  } finally {
    await client.end();
  }
}

// Field mapping for audit trail
const fieldMap: Partial<Record<keyof CategoryRule, string>> = {
  category: 'category',
  min_pvp: 'minPvp',
  override_multiplier: 'overrideMultiplier',
  override_ink_factor: 'overrideInkFactor'
};
