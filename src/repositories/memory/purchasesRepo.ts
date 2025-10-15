import { PurchasesRepo } from '../interfaces';
import { Purchase, PurchaseItem, PurchaseWithDetails } from '@/lib/purchases/types';

const purchases: Purchase[] = [];
const purchaseItems: PurchaseItem[] = [];
let nextPurchaseId = 1;
let nextItemId = 1;

export class MemoryPurchasesRepo implements PurchasesRepo {
  async list(options?: { 
    limit?: number; 
    offset?: number; 
    search?: string; 
    supplierId?: string; 
    dateFrom?: Date; 
    dateTo?: Date 
  }): Promise<{ purchases: PurchaseWithDetails[]; total: number }> {
    let filtered = [...purchases];

    // Apply filters
    if (options?.supplierId) {
      filtered = filtered.filter(p => p.supplierId === options.supplierId);
    }

    if (options?.dateFrom) {
      filtered = filtered.filter(p => p.date >= options.dateFrom!);
    }

    if (options?.dateTo) {
      filtered = filtered.filter(p => p.date <= options.dateTo!);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.invoiceNo?.toLowerCase().includes(searchLower) ||
        p.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = filtered.length;
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginatedPurchases = filtered.slice(offset, offset + limit);

    // Add details to purchases
    const purchasesWithDetails: PurchaseWithDetails[] = paginatedPurchases.map(purchase => {
      const items = purchaseItems.filter(item => item.purchaseId === purchase.id);
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        ...purchase,
        items,
        totalAmount,
        itemsCount: items.length,
        supplierName: purchase.supplierId ? `Supplier ${purchase.supplierId}` : undefined
      };
    });

    return { purchases: purchasesWithDetails, total };
  }

  async getById(id: string): Promise<PurchaseWithDetails | null> {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return null;

    const items = purchaseItems.filter(item => item.purchaseId === id);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      ...purchase,
      items,
      totalAmount,
      itemsCount: items.length,
      supplierName: purchase.supplierId ? `Supplier ${purchase.supplierId}` : undefined
    };
  }

  async create(
    purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>, 
    items: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Purchase> {
    const now = new Date();
    const newPurchase: Purchase = {
      ...purchase,
      id: `purchase_${nextPurchaseId++}`,
      createdAt: now,
      updatedAt: now
    };

    purchases.push(newPurchase);

    // Create items
    for (const item of items) {
      const newItem: PurchaseItem = {
        ...item,
        id: `item_${nextItemId++}`,
        purchaseId: newPurchase.id,
        createdAt: now,
        updatedAt: now
      };
      purchaseItems.push(newItem);
    }

    return newPurchase;
  }

  async update(id: string, patch: Partial<Purchase>): Promise<Purchase> {
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Compra con ID ${id} no encontrada`);
    }

    const updatedPurchase = {
      ...purchases[index],
      ...patch,
      updatedAt: new Date()
    };

    purchases[index] = updatedPurchase;
    return updatedPurchase;
  }

  async updateWithItems(
    id: string, 
    purchase: Partial<Purchase>, 
    items?: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Purchase> {
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Compra con ID ${id} no encontrada`);
    }

    const updatedPurchase = {
      ...purchases[index],
      ...purchase,
      updatedAt: new Date()
    };

    purchases[index] = updatedPurchase;

    // If items are provided, replace all items
    if (items) {
      // Remove existing items for this purchase
      const itemsToRemove = purchaseItems.filter(item => item.purchaseId === id);
      itemsToRemove.forEach(item => {
        const itemIndex = purchaseItems.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          purchaseItems.splice(itemIndex, 1);
        }
      });

      // Add new items
      const now = new Date();
      items.forEach(item => {
        const newItem: PurchaseItem = {
          ...item,
          id: `item_${nextItemId++}`,
          purchaseId: id,
          createdAt: now,
          updatedAt: now
        };
        purchaseItems.push(newItem);
      });
    }

    // Return full purchase with details
    const fullPurchase = await this.getById(id);
    if (!fullPurchase) {
      throw new Error(`Compra con ID ${id} no encontrada después de actualizar`);
    }
    return fullPurchase;
  }

  async addItem(
    purchaseId: string, 
    item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>
  ): Promise<PurchaseItem> {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
      throw new Error(`Compra con ID ${purchaseId} no encontrada`);
    }

    const now = new Date();
    const newItem: PurchaseItem = {
      ...item,
      id: `item_${nextItemId++}`,
      purchaseId,
      createdAt: now,
      updatedAt: now
    };

    purchaseItems.push(newItem);
    return newItem;
  }

  async updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem> {
    const index = purchaseItems.findIndex(item => item.id === itemId);
    if (index === -1) {
      throw new Error(`Artículo con ID ${itemId} no encontrado`);
    }

    const updatedItem = {
      ...purchaseItems[index],
      ...patch,
      updatedAt: new Date()
    };

    purchaseItems[index] = updatedItem;
    return updatedItem;
  }

  async delete(id: string): Promise<void> {
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Compra con ID ${id} no encontrada`);
    }

    // Remove all items for this purchase
    const itemsToRemove = purchaseItems.filter(item => item.purchaseId === id);
    itemsToRemove.forEach(item => {
      const itemIndex = purchaseItems.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        purchaseItems.splice(itemIndex, 1);
      }
    });

    // Remove the purchase
    purchases.splice(index, 1);
  }

  async deleteItem(itemId: string): Promise<void> {
    const index = purchaseItems.findIndex(item => item.id === itemId);
    if (index === -1) {
      throw new Error(`Artículo con ID ${itemId} no encontrado`);
    }

    purchaseItems.splice(index, 1);
  }
}