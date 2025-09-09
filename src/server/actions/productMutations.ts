"use server";

import { createDbClient } from '@/db/client';
import { products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Product } from '@/lib/pricing/types';

// Optimized version - uses connection pooling, no manual connect/disconnect

export async function updateProduct(sku: string, patch: Partial<Product>): Promise<Product> {
  const { db } = createDbClient();

  // Get current product for audit
  const [currentProduct] = await db.select().from(products).where(eq(products.sku, sku));
  
  if (!currentProduct) {
    throw new Error(`Product not found: ${sku}`);
  }

  // Prepare update data - transform from frontend types to DB types
  const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
  
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.category !== undefined) updateData.category = patch.category;
  if (patch.providerId !== undefined) updateData.providerId = patch.providerId;
  if (patch.cost_sqft !== undefined) updateData.costSqft = patch.cost_sqft.toString();
  if (patch.area_sqft !== undefined) updateData.areaSqft = patch.area_sqft.toString();
  if (patch.active_tier !== undefined) updateData.activeTier = patch.active_tier;
  if (patch.min_pvp !== undefined) updateData.minPvp = patch.min_pvp ? patch.min_pvp.toString() : null;
  if (patch.override_multiplier !== undefined) updateData.overrideMultiplier = patch.override_multiplier ? patch.override_multiplier.toString() : null;
  if (patch.override_ink_factor !== undefined) updateData.overrideInkFactor = patch.override_ink_factor;
  if (patch.ink_enabled !== undefined) updateData.inkEnabled = patch.ink_enabled;
  if (patch.lam_enabled !== undefined) updateData.lamEnabled = patch.lam_enabled;
  if (patch.cut_enabled !== undefined) updateData.cutEnabled = patch.cut_enabled;
  if (patch.sheets_count !== undefined) updateData.sheetsCount = patch.sheets_count;
  if (patch.active !== undefined) updateData.active = patch.active;

  // Field mapping for audit (only include actual Product fields, not DB-only fields)
  const fieldMap: Record<string, string> = {
    sku: 'sku',
    name: 'name',
    category: 'category',
    providerId: 'providerId',
    cost_sqft: 'costSqft',
    area_sqft: 'areaSqft',
    active_tier: 'activeTier',
    min_pvp: 'minPvp',
    override_multiplier: 'overrideMultiplier',
    override_ink_factor: 'overrideInkFactor',
    ink_enabled: 'inkEnabled',
    lam_enabled: 'lamEnabled',
    cut_enabled: 'cutEnabled',
    sheets_count: 'sheetsCount',
    active: 'active'
  };

  // Create audit entries for changed fields
  const auditEntries = [];
  for (const [field, newValue] of Object.entries(patch)) {
    const dbField = fieldMap[field];
    if (dbField) {
      const oldValue = (currentProduct as Record<string, unknown>)[dbField];
      if (oldValue !== newValue) {
        auditEntries.push({
          entity: 'product',
          entityId: sku,
          field: field,
          before: oldValue,
          after: newValue,
          userId: 'system'
        });
      }
    }
  }

  // Update product
  const [updatedProduct] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.sku, sku))
    .returning();

  // Insert audit entries if any
  if (auditEntries.length > 0) {
    await db.insert(auditLog).values(auditEntries);
  }

  // Transform back to frontend format
  const result: Product = {
    sku: updatedProduct.sku,
    name: updatedProduct.name,
    category: updatedProduct.category,
    providerId: updatedProduct.providerId,
    cost_sqft: parseFloat(updatedProduct.costSqft || '0'),
    area_sqft: parseFloat(updatedProduct.areaSqft || '0'),
    active_tier: updatedProduct.activeTier,
    min_pvp: updatedProduct.minPvp ? parseFloat(updatedProduct.minPvp) : undefined,
    override_multiplier: updatedProduct.overrideMultiplier ? parseFloat(updatedProduct.overrideMultiplier) : undefined,
    override_ink_factor: updatedProduct.overrideInkFactor ?? undefined,
    ink_enabled: updatedProduct.inkEnabled,
    lam_enabled: updatedProduct.lamEnabled,
    cut_enabled: updatedProduct.cutEnabled,
    sheets_count: updatedProduct.sheetsCount ?? undefined,
    active: updatedProduct.active
  };

  revalidatePath('/');
  return result;
}

export async function createProduct(product: Product): Promise<Product> {
  const { db } = createDbClient();
  
  const insertData = {
    sku: product.sku,
    name: product.name,
    category: product.category,
    providerId: product.providerId,
    costSqft: product.cost_sqft.toString(),
    areaSqft: product.area_sqft.toString(),
    activeTier: product.active_tier,
    minPvp: product.min_pvp?.toString(),
    overrideMultiplier: product.override_multiplier?.toString(),
    overrideInkFactor: product.override_ink_factor,
    inkEnabled: product.ink_enabled,
    lamEnabled: product.lam_enabled,
    cutEnabled: product.cut_enabled,
    sheetsCount: product.sheets_count,
    active: product.active
  };

  const [newProduct] = await db.insert(products).values(insertData).returning();

  // Create audit entry
  await db.insert(auditLog).values({
    entity: 'product',
    entityId: product.sku,
    field: 'create',
    before: null,
    after: JSON.stringify(product),
    userId: 'system'
  });

  // Transform back to frontend format
  const result: Product = {
    sku: newProduct.sku,
    name: newProduct.name,
    category: newProduct.category,
    providerId: newProduct.providerId,
    cost_sqft: parseFloat(newProduct.costSqft || '0'),
    area_sqft: parseFloat(newProduct.areaSqft || '0'),
    active_tier: newProduct.activeTier,
    min_pvp: newProduct.minPvp ? parseFloat(newProduct.minPvp) : undefined,
    override_multiplier: newProduct.overrideMultiplier ? parseFloat(newProduct.overrideMultiplier) : undefined,
    override_ink_factor: newProduct.overrideInkFactor ?? undefined,
    ink_enabled: newProduct.inkEnabled,
    lam_enabled: newProduct.lamEnabled,
    cut_enabled: newProduct.cutEnabled,
    sheets_count: newProduct.sheetsCount ?? undefined,
    active: newProduct.active
  };

  revalidatePath('/');
  return result;
}

export async function softDeleteProduct(sku: string): Promise<void> {
  const { db } = createDbClient();
  
  await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(eq(products.sku, sku));

  // Create audit entry
  await db.insert(auditLog).values({
    entity: 'product',
    entityId: sku,
    field: 'delete',
    before: null,
    after: 'soft_deleted',
    userId: 'system'
  });

  revalidatePath('/');
}
