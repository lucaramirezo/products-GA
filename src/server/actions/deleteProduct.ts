"use server";

import { getDb } from '@/db/client';
import { products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(sku: string): Promise<{ success: boolean; message: string }> {
  const db = getDb();

  try {
    // Get product first to verify it exists
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    // Soft delete: update deleted_at timestamp
    await db
      .update(products)
      .set({ 
        deletedAt: new Date(),
        active: false,
        updatedAt: new Date()
      })
      .where(eq(products.sku, sku));

    // Create audit log entry
    await db.insert(auditLog).values({
      entity: 'products',
      entityId: sku,
      field: 'deleted',
      before: null,
      after: new Date().toISOString(),
      userId: 'admin' // TODO: Get from session
    });

    revalidatePath('/');
    return { success: true, message: 'Product deleted successfully' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Failed to delete product' };
  }
}