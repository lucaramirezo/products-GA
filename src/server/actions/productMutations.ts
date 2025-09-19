"use server";

import { getDb, getPool } from '@/db/client';
import { products, auditLog } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Product } from '@/lib/pricing/types';
import type { Pool } from 'pg';

// Helper function to adjust sequence to next available SKU
async function adjustSequenceToNextAvailable(pool: Pool): Promise<void> {
  try {
    // Get all existing SKUs that follow the SKU-XXX pattern
    const result = await pool.query(`
      SELECT sku FROM products 
      WHERE sku ~ '^SKU-[0-9]{3}$' 
      ORDER BY sku
    `);
    
    const existingSkus = result.rows.map((r: { sku: string }) => r.sku);
    
    // Extract numbers from SKUs and find the next available one
    const existingNumbers = existingSkus.map((sku: string) => {
      const match = sku.match(/^SKU-(\d{3})$/);
      return match ? parseInt(match[1], 10) : null;
    }).filter((num: number | null) => num !== null).sort((a: number, b: number) => a - b);
    
    // Find the first gap or next number
    let nextNumber = 0;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break; // Found a gap
      }
    }
    
    // Set the sequence to the next available number
    await pool.query('SELECT setval($1, $2, false)', ['sku_seq', nextNumber]);
    
    console.log(`Sequence adjusted to next available SKU: ${nextNumber} (SKU-${nextNumber.toString().padStart(3, '0')})`);
  } catch (error) {
    console.error('Error adjusting sequence:', error);
    throw error;
  }
}

// Optimized version - uses single pooled DB connection

export async function updateProduct(sku: string, patch: Partial<Product>): Promise<Product> {
  const db = getDb();

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
  if (patch.override_multiplier !== undefined) updateData.overrideMultiplier = patch.override_multiplier ? patch.override_multiplier.toString() : null;
  if (patch.override_number_of_layers !== undefined) updateData.overrideNumberOfLayers = patch.override_number_of_layers;
  if (patch.ink_enabled !== undefined) updateData.inkEnabled = patch.ink_enabled;
  if (patch.lam_enabled !== undefined) updateData.lamEnabled = patch.lam_enabled;
  if (patch.cut_enabled !== undefined) updateData.cutEnabled = patch.cut_enabled;
  if (patch.sell_mode !== undefined) updateData.sellMode = patch.sell_mode;
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
    override_multiplier: 'overrideMultiplier',
    override_number_of_layers: 'overrideNumberOfLayers',
    ink_enabled: 'inkEnabled',
    lam_enabled: 'lamEnabled',
    cut_enabled: 'cutEnabled',
    sell_mode: 'sellMode',
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
    override_multiplier: updatedProduct.overrideMultiplier ? parseFloat(updatedProduct.overrideMultiplier) : undefined,
    override_number_of_layers: updatedProduct.overrideNumberOfLayers ?? undefined,
    ink_enabled: updatedProduct.inkEnabled,
    lam_enabled: updatedProduct.lamEnabled,
    cut_enabled: updatedProduct.cutEnabled,
    sell_mode: updatedProduct.sellMode as 'SQFT' | 'SHEET',
    sheets_count: updatedProduct.sheetsCount ?? undefined,
    active: updatedProduct.active
  };

  revalidatePath('/');
  return result;
}

export async function createProduct(product: Product): Promise<Product> {
  const db = getDb();
  const pool = getPool();
  
  // Auto-generate SKU if it's a placeholder (NEW-xxx) or missing
  const shouldAutoGenerate = !product.sku || product.sku.startsWith('NEW-');
  
  if (shouldAutoGenerate) {
    // Find next available SKU to avoid conflicts
    await adjustSequenceToNextAvailable(pool);
  }
  
  const insertData = {
    sku: shouldAutoGenerate ? sql`DEFAULT` : product.sku,
    name: product.name,
    category: product.category,
    providerId: product.providerId,
    costSqft: product.cost_sqft.toString(),
    areaSqft: product.area_sqft.toString(),
    activeTier: product.active_tier,
    overrideMultiplier: product.override_multiplier?.toString(),
    overrideNumberOfLayers: product.override_number_of_layers,
    inkEnabled: product.ink_enabled,
    lamEnabled: product.lam_enabled,
    cutEnabled: product.cut_enabled,
    sellMode: product.sell_mode,
    sheetsCount: product.sheets_count,
    active: product.active
  };

  let newProduct;
  try {
    [newProduct] = await db.insert(products).values(insertData).returning();
  } catch (error: unknown) {
    // If we get a duplicate key error and we're auto-generating, try to fix sequence and retry
    if (shouldAutoGenerate && error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      console.log('SKU conflict detected, adjusting sequence and retrying...');
      await adjustSequenceToNextAvailable(pool);
      [newProduct] = await db.insert(products).values(insertData).returning();
    } else {
      throw error;
    }
  }

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
    override_multiplier: newProduct.overrideMultiplier ? parseFloat(newProduct.overrideMultiplier) : undefined,
    override_number_of_layers: newProduct.overrideNumberOfLayers ?? undefined,
    ink_enabled: newProduct.inkEnabled,
    lam_enabled: newProduct.lamEnabled,
    cut_enabled: newProduct.cutEnabled,
    sell_mode: newProduct.sellMode as 'SQFT' | 'SHEET',
    sheets_count: newProduct.sheetsCount ?? undefined,
    active: newProduct.active
  };

  revalidatePath('/');
  return result;
}

export async function softDeleteProduct(sku: string): Promise<void> {
  const db = getDb();
  
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
