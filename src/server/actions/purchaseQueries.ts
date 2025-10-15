"use server";

import { buildDbServices } from '@/services/dbServiceContainer';

export async function getPurchasesList(options?: { 
  limit?: number; 
  offset?: number; 
  search?: string; 
  supplierId?: string; 
  dateFrom?: Date; 
  dateTo?: Date 
}) {
  const { services } = await buildDbServices();
  return services.purchases.list(options);
}

export async function getPurchaseById(id: string) {
  const { services } = await buildDbServices();
  return services.purchases.getById(id);
}