"use server";

import { revalidatePath } from 'next/cache';
import { buildDbServices } from '@/services/dbServiceContainer';
import type { CreatePurchaseInput, Purchase } from '@/lib/purchases/types';

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