"use server";

import { getDb } from '@/db/client';
import { providers, products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Provider } from '@/server/queries/getInitialData';

export async function updateProvider(id: string, patch: Partial<Provider>): Promise<Provider> {
  const db = getDb();

    // Get current provider for audit
    const [currentProvider] = await db.select().from(providers).where(eq(providers.id, id));
    
    if (!currentProvider) {
      throw new Error(`Provider not found: ${id}`);
    }

    // Prepare update data
    const updateData: Record<string, string | number | boolean | Date | null | undefined> = {};
    
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.lastUpdate !== undefined) updateData.lastUpdate = new Date(patch.lastUpdate);

    // Update the provider
    const [updatedProvider] = await db
      .update(providers)
      .set(updateData)
      .where(eq(providers.id, id))
      .returning();

    // Create audit entries for changed fields
    const auditEntries = [];
    for (const [field, newValue] of Object.entries(patch)) {
      const oldValue = (currentProvider as Record<string, unknown>)[field];
      if (oldValue !== newValue) {
        auditEntries.push({
          entity: 'provider',
          entityId: id,
          field: field,
          before: oldValue,
          after: newValue,
          userId: 'admin' // TODO: Get from session
        });
      }
    }

    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(auditEntries);
    }

    // Transform back to frontend type
    const result: Provider = {
      id: updatedProvider.id,
      name: updatedProvider.name,
      lastUpdate: updatedProvider.lastUpdate?.toISOString()
    };

    revalidatePath('/');
    return result;
}

export async function simulateImport(providerId: string): Promise<{ provider: Provider; affectedProducts: number }> {
  const db = getDb();

    // Get current provider
    const [currentProvider] = await db.select().from(providers).where(eq(providers.id, providerId));
    
    if (!currentProvider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Get products from this provider
    const providerProducts = await db.select().from(products).where(eq(products.providerId, providerId));
    
    // Simulate cost perturbation (±6% random factor)
    const factor = 1 + (Math.random() * 0.12 - 0.06); // -6% to +6%
    
    const updatePromises = [];
    const auditPromises = [];
    
    for (const product of providerProducts) {
      const oldCost = Number(product.costSqft);
      const newCost = Number((oldCost * factor).toFixed(4));
      
      // Update product cost
      updatePromises.push(
        db.update(products)
          .set({ 
            costSqft: newCost.toString(),
            updatedAt: new Date()
          })
          .where(eq(products.sku, product.sku))
      );
      
      // Log the cost change
      auditPromises.push({
        entity: 'product',
        entityId: product.sku,
        field: 'cost_sqft',
        before: oldCost,
        after: newCost,
        userId: 'admin'
      });
    }
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    // Update provider lastUpdate timestamp
    const [updatedProvider] = await db
      .update(providers)
      .set({ lastUpdate: new Date() })
      .where(eq(providers.id, providerId))
      .returning();
    
    // Insert audit logs
    if (auditPromises.length > 0) {
      await db.insert(auditLog).values(auditPromises);
    }
    
    // Log the import simulation
    await db.insert(auditLog).values({
      entity: 'provider',
      entityId: providerId,
      field: 'simulate_import',
      before: null,
      after: `factor: ${factor.toFixed(4)}, products: ${providerProducts.length}`,
      userId: 'admin'
    });

    const result = {
      provider: {
        id: updatedProvider.id,
        name: updatedProvider.name,
        lastUpdate: updatedProvider.lastUpdate?.toISOString()
      },
      affectedProducts: providerProducts.length
    };

    revalidatePath('/');
    return result;
}

export async function createProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
  const db = getDb();

    const insertData = {
      name: provider.name,
      lastUpdate: provider.lastUpdate ? new Date(provider.lastUpdate) : new Date()
    };

    const [newProvider] = await db.insert(providers).values(insertData).returning();

    // Log creation
    await db.insert(auditLog).values({
      entity: 'provider',
      entityId: newProvider.id,
      field: 'create',
      before: null,
      after: JSON.stringify(provider),
      userId: 'admin'
    });

    const result: Provider = {
      id: newProvider.id,
      name: newProvider.name,
      lastUpdate: newProvider.lastUpdate?.toISOString()
    };

    revalidatePath('/');
    return result;
}
