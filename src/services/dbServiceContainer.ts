import { DrizzleProductsRepo } from '@/repositories/drizzle/productsRepo';
import { DrizzleTiersRepo } from '@/repositories/drizzle/tiersRepo';
import { DrizzleCategoryRulesRepo } from '@/repositories/drizzle/categoryRulesRepo';
import { DrizzleParamsRepo } from '@/repositories/drizzle/paramsRepo';
import { DrizzleProvidersRepo } from '@/repositories/drizzle/providersRepo';
import { DrizzleAuditRepo } from '@/repositories/drizzle/auditRepo';
import { DrizzlePriceCacheRepo } from '@/repositories/drizzle/priceCacheRepo';
import { DrizzlePurchasesRepo } from '@/repositories/drizzle/purchasesRepo';
import { PricingService } from './pricingService';
import { PurchaseService } from './purchaseService';
import { getDb } from '@/db/client';
import { logPoolStatsOnce } from '@/db/check';
import { pricingCache } from './cacheService';

import { DrizzleDb } from '@/db/types';
import { PriceBreakdown } from '@/lib/pricing/types';
import { PurchaseWithDetails } from '@/lib/purchases/types';

interface PricingLike { 
  getPriceBySku: (sku:string, toggles:{ink:boolean;lam:boolean;cut:boolean;sheets?:number;})=>Promise<PriceBreakdown>; 
}

interface PurchaseLike { 
  list: (options?: { limit?: number; offset?: number; search?: string; supplierId?: string; dateFrom?: Date; dateTo?: Date }) => Promise<{ purchases: PurchaseWithDetails[]; total: number }>; 
  getById: (id: string) => Promise<PurchaseWithDetails | null>; 
  save: (dto: unknown) => Promise<unknown>; 
  update: (id: string, patch: unknown) => Promise<unknown>;
  delete: (id: string) => Promise<void>;
}

interface Container { 
  db:DrizzleDb; 
  repos:{ products:unknown; tiers:unknown; categories:unknown; params:unknown; providers:unknown; audit:unknown; priceCache:unknown; purchases:unknown }; 
  services:{ pricing: PricingLike; purchases: PurchaseLike } 
}
let _containerPromise: Promise<Container> | null = null;

export function buildDbServices(){
  if(_containerPromise) return _containerPromise;
  _containerPromise = (async () => {
    const db = getDb(); // fuerza inicialización
    logPoolStatsOnce(); // imprime una vez en dev
    // Repos
    const products = new DrizzleProductsRepo(db as DrizzleDb);
    const tiers = new DrizzleTiersRepo(db as DrizzleDb);
    const categories = new DrizzleCategoryRulesRepo(db as DrizzleDb);
    const params = new DrizzleParamsRepo(db as DrizzleDb);
    const providers = new DrizzleProvidersRepo(db as DrizzleDb);
    const audit = new DrizzleAuditRepo(db as DrizzleDb);
    const priceCacheRepo = new DrizzlePriceCacheRepo(db as DrizzleDb);
    const purchases = new DrizzlePurchasesRepo();
    const pricing = new PricingService({ products, tiers, categories, params });
    const purchaseService = new PurchaseService(purchases, products, providers, audit);
    
    // Create a wrapper to match PurchaseLike interface
    const purchaseServiceWrapper = {
      list: purchaseService.list.bind(purchaseService),
      getById: purchaseService.getById.bind(purchaseService), 
      save: purchaseService.save.bind(purchaseService),
      update: purchaseService.updatePurchase.bind(purchaseService),
      delete: purchaseService.deletePurchase.bind(purchaseService)
    };
    
    // Decorate pricing with simple cache for getPriceBySku
    const cachedPricing = {
      async getPriceBySku(sku:string, toggles:{ink:boolean;lam:boolean;cut:boolean;sheets?:number;}){
        const key = `${sku}|${toggles.ink}|${toggles.lam}|${toggles.cut}|${toggles.sheets ?? ''}`;
        const hit = pricingCache.get(key);
        if(hit) return hit;
        const value = await pricing.getPriceBySku(sku, toggles);
        pricingCache.set(key, value);
        return value;
      }
    };
    return { db, repos:{ products, tiers, categories, params, providers, audit, priceCache: priceCacheRepo, purchases }, services:{ pricing: cachedPricing, purchases: purchaseServiceWrapper } } as Container;
  })();
  return _containerPromise;
}
