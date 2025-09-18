import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import { 
  Purchase, PurchaseItem, PriceEntry, CreatePurchaseDTO, 
  PurchaseWithItems, PaginationParams, PurchaseFilters 
} from '@/lib/types/purchase';

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

export interface AuditEntry { entity:string; id:string; field:string; before:unknown; after:unknown; date:string; user:string; }

// Purchases Repository
export interface PurchasesRepository {
  // CRUD operations
  list(filters?: PurchaseFilters, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }>;
  getById(id: string): Promise<PurchaseWithItems | null>;
  create(dto: CreatePurchaseDTO): Promise<PurchaseWithItems>;
  update(id: string, patch: Partial<Purchase>): Promise<Purchase>;
  softDelete(id: string): Promise<void>;
  
  // Specific queries
  findByDateRange(from: Date, to: Date, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }>;
  findBySupplier(supplierId: string, pagination?: PaginationParams): Promise<{ purchases: PurchaseWithItems[]; total: number }>;
  findByInvoiceNo(invoiceNo: string): Promise<PurchaseWithItems | null>;
  
  // Items operations
  addItem(purchaseId: string, item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseItem>;
  updateItem(itemId: string, patch: Partial<PurchaseItem>): Promise<PurchaseItem>;
  deleteItem(itemId: string): Promise<void>;
}

// PriceBook Repository
export interface PriceBookRepository {
  // Price entries CRUD
  listByProduct(productId: string): Promise<PriceEntry[]>;
  getById(id: string): Promise<PriceEntry | null>;
  createEntry(entry: Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceEntry>;
  updateEntry(id: string, patch: Partial<PriceEntry>): Promise<PriceEntry>;
  softDelete(id: string): Promise<void>;
  
  // Pin management
  pinEntry(productId: string, entryId: string): Promise<void>;
  unpinEntry(productId: string, entryId: string): Promise<void>;
  unpinAllForProduct(productId: string): Promise<void>;
  
  // Active status management
  activateEntry(id: string): Promise<void>;
  deactivateEntry(id: string): Promise<void>;
  
  // Current cost resolution
  resolveCurrent(productId: string): Promise<PriceEntry | null>;
  resolveCurrentCost(productId: string): Promise<number | null>;
}
