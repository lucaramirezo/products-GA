"use server";

import { getDb } from '@/db/client';
import { purchases, purchaseItems, products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { calculateCostPerSqft } from '@/lib/purchases/calculations';
import type { CreatePurchaseInput, Purchase } from '@/lib/purchases/types';

/**
 * Create a new purchase with items
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const db = getDb();

  try {
    const result = await db.transaction(async (tx) => {
      // Create purchase
      const [purchase] = await tx.insert(purchases).values({
        supplierId: input.supplierId || null,
        invoiceNo: input.invoiceNo || null,
        date: input.date,
        currency: input.currency || 'USD',
        notes: input.notes || null,
      }).returning();

      // Create purchase items
      const itemsToInsert = input.items.map(item => ({
        purchaseId: purchase.id,
        productId: item.productId || null,
        name: item.name,
        qty: item.qty.toString(),
        unit: item.unit,
        amount: item.amount.toString(),
        linked: item.linked || false,
        appliedToProduct: item.appliedToProduct || false,
        tempWidth: item.tempWidth?.toString() || null,
        tempHeight: item.tempHeight?.toString() || null,
        tempUom: item.tempUom || null,
      }));

      await tx.insert(purchaseItems).values(itemsToInsert);

      // Apply cost updates to linked products if requested
      for (const item of input.items) {
        if (item.appliedToProduct && item.productId && item.linked) {
          // Get product area for calculation
          const [product] = await tx.select({
            sku: products.sku,
            areaSqft: products.areaSqft,
            costSqft: products.costSqft
          }).from(products).where(eq(products.sku, item.productId));

          if (product) {
            const newCostSqft = calculateCostPerSqft(item, parseFloat(product.areaSqft));
            
            if (newCostSqft !== null) {
              const oldCostSqft = parseFloat(product.costSqft);
              
              // Update product cost
              await tx.update(products)
                .set({ 
                  costSqft: newCostSqft.toString(),
                  updatedAt: new Date()
                })
                .where(eq(products.sku, item.productId));

              // Log audit entry
              await tx.insert(auditLog).values({
                entity: 'products',
                entityId: item.productId,
                field: 'cost_sqft',
                before: oldCostSqft,
                after: newCostSqft,
                userId: 'system' // TODO: Get actual user ID from session
              });
            }
          }
        }
      }

      return purchase;
    });

    revalidatePath('/');
    revalidatePath('/compras');
    
    return {
      id: result.id,
      supplierId: result.supplierId || undefined,
      invoiceNo: result.invoiceNo || undefined,
      date: result.date,
      currency: result.currency || undefined,
      notes: result.notes || undefined,
      createdAt: result.createdAt!,
      updatedAt: result.updatedAt!,
    };

  } catch (error) {
    console.error('Error creating purchase:', error);
    throw new Error('Error al crear la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

/**
 * Get all purchases with basic info
 */
export async function getPurchases(): Promise<Purchase[]> {
  const db = getDb();
  
  const result = await db.select().from(purchases).orderBy(purchases.date);
  
  return result.map(p => ({
    id: p.id,
    supplierId: p.supplierId || undefined,
    invoiceNo: p.invoiceNo || undefined,
    date: p.date,
    currency: p.currency || undefined,
    notes: p.notes || undefined,
    createdAt: p.createdAt!,
    updatedAt: p.updatedAt!,
  }));
}