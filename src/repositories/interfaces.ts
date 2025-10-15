import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import { Purchase, PurchaseItem, PurchaseWithDetails } from '@/lib/purchases/types';

export interface ProductsRepo {
  list(): Promise<Product[]>;
  getBySku(sku:string): Promise<Product|null>;
  upsert(p:Product): Promise<void>;
  updatePartial(sku:string, patch:Partial<Product>): Promise<Product>;
  softDelete(sku:string): Promise<void>;
}

export interface TiersRepo {
  list():Promise<Tier[]>;
  get(id:number):Promise<Tier|null>;
  update(id:number, patch:Partial<Tier>):Promise<Tier>;
}

export interface CategoryRulesRepo {
  list():Promise<CategoryRule[]>;
  get(category:string):Promise<CategoryRule|null>;
  upsert(rule:CategoryRule):Promise<void>;
  delete(category:string):Promise<void>;
}

export interface ParamsRepo {
  get():Promise<PriceParams>;
  update(patch:Partial<PriceParams>):Promise<PriceParams>;
}

export interface ProvidersRepo {
  list():Promise<{id:string; name:string; lastUpdate?:string}[]>;
  get(id:string):Promise<{id:string; name:string; lastUpdate?:string}|null>;
  upsert(p:{id:string; name:string; lastUpdate?:string}):Promise<void>;
}

export interface AuditRepo {
  insert(entries:AuditEntry[]):Promise<void>;
  latest(limit:number):Promise<AuditEntry[]>;
}

export interface PurchasesRepo {
  list(options?: { limit?: number; offset?: number; search?: string; supplierId?: string; dateFrom?: Date; dateTo?: Date }): Promise<{ purchases: PurchaseWithDetails[]; total: number }>;
  getById(id: string): Promise<PurchaseWithDetails | null>;
  create(purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]): Promise<Purchase>;
  update(id: string, patch: Partial<Purchase>): Promise<Purchase>;
  updateWithItems(id: string, purchase: Partial<Purchase>, items?: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>[]): Promise<Purchase>;
  delete(id: string): Promise<void>;
  addItem(purchaseId: string, item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseItem>;
  updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem>;
  deleteItem(itemId: string): Promise<void>;
}

export interface AuditEntry { entity:string; id:string; field:string; before:unknown; after:unknown; date:string; user:string; }
