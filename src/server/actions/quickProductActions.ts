"use server";

import { revalidatePath } from 'next/cache';
import { createProduct } from './productMutations';
import { Product } from '@/lib/pricing/types';

export interface QuickProductInput {
  name: string;
  category: string;
  providerId?: string; // Make optional
  area_sqft?: number;
  cost_sqft?: number;
}

/**
 * Create a quick product from purchase form
 */
export async function createQuickProduct(input: QuickProductInput): Promise<Product> {
  try {
    // Create product with defaults - let the database auto-generate SKU
    const newProduct: Product = {
      sku: '', // Empty SKU will trigger auto-generation via database sequence
      name: input.name.trim(),
      category: input.category || 'General',
      providerId: input.providerId || 'default', // Use default provider if none specified
      cost_sqft: input.cost_sqft || 1,
      area_sqft: input.area_sqft || 1,
      active_tier: 1, // Default tier
      ink_enabled: true,
      lam_enabled: false,
      cut_enabled: false,
      active: true,
    };

    const created = await createProduct(newProduct);

    revalidatePath('/');
    
    return created;
  } catch (error) {
    console.error('Error creating quick product:', error);
    throw new Error('Error al crear el producto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}