"use server";

import { revalidatePath } from 'next/cache';
import { buildDbServices } from '@/services/dbServiceContainer';
import type { CreatePurchaseInput, UpdatePurchaseInput, Purchase } from '@/lib/purchases/types';

/**
 * Create a new purchase with items using the service layer
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  try {
    const { services } = await buildDbServices();
    const purchase = await services.purchases.save(input) as Purchase;

    revalidatePath('/');
    revalidatePath('/compras');
    
    return purchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw new Error('Error al crear la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

/**
 * Update an existing purchase
 */
export async function updatePurchase(id: string, input: Partial<Purchase>): Promise<Purchase> {
  try {
    const { services } = await buildDbServices();
    const purchase = await services.purchases.update(id, input) as Purchase;

    revalidatePath('/');
    revalidatePath('/compras');
    
    return purchase;
  } catch (error) {
    console.error('Error updating purchase:', error);
    throw new Error('Error al actualizar la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

/**
 * Update an existing purchase with items
 */
export async function updatePurchaseWithItems(
  id: string, 
  input: UpdatePurchaseInput
): Promise<Purchase> {
  try {
    const { services } = await buildDbServices();
    const purchase = await services.purchases.updateWithItems(id, input, input.items) as Purchase;

    revalidatePath('/');
    revalidatePath('/compras');
    
    return purchase;
  } catch (error) {
    console.error('Error updating purchase with items:', error);
    throw new Error('Error al actualizar la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

/**
 * Delete a purchase (soft delete)
 */
export async function deletePurchase(id: string): Promise<void> {
  try {
    const { services } = await buildDbServices();
    await services.purchases.delete(id);

    revalidatePath('/');
    revalidatePath('/compras');
  } catch (error) {
    console.error('Error deleting purchase:', error);
    throw new Error('Error al eliminar la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

/**
 * Get all purchases with basic info
 */
export async function getPurchases() {
  try {
    const { services } = await buildDbServices();
    const result = await services.purchases.list();
    return result.purchases;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw new Error('Error al obtener las compras: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}