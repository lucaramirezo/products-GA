import { DrizzleProductsRepo } from '@/repositories/drizzle/productsRepo';
import { DrizzleTiersRepo } from '@/repositories/drizzle/tiersRepo';
import { DrizzleCategoryRulesRepo } from '@/repositories/drizzle/categoryRulesRepo';
import { DrizzleParamsRepo } from '@/repositories/drizzle/paramsRepo';
import { DrizzleProvidersRepo } from '@/repositories/drizzle/providersRepo';
import { DrizzleAuditRepo } from '@/repositories/drizzle/auditRepo';
import { DrizzlePriceCacheRepo } from '@/repositories/drizzle/priceCacheRepo';
import { DrizzlePurchasesRepository } from '@/repositories/drizzle/purchasesRepo';
import { DrizzlePriceBookRepository } from '@/repositories/drizzle/priceBookRepo';
import { PricingService } from './pricingService';
import { PurchaseService } from './purchaseService';
import { PriceBookService } from './priceBookService';
import { XLSXImporterService } from './xlsxImporter';
import { getDb } from '@/db/client';
import { logPoolStatsOnce } from '@/db/check';
import { pricingCache } from './cacheService';

import { DrizzleDb } from '@/db/types';
import { PriceBreakdown } from '@/lib/pricing/types';
interface PricingLike { getPriceBySku: (sku:string, toggles:{ink:boolean;lam:boolean;cut:boolean;sheets?:number;})=>Promise<PriceBreakdown>; }
interface Container { 
  db: DrizzleDb; 
  repos: { 
    products: unknown; 
    tiers: unknown; 
    categories: unknown; 
    params: unknown; 
    providers: unknown; 
    audit: unknown; 
    priceCache: unknown;
    purchases: unknown;
    priceBook: unknown;
  }; 
  services: { 
    pricing: PricingLike;
    purchases: unknown;
    priceBook: unknown;
    xlsxImporter: unknown;
  } 
}
let _containerPromise: Promise<Container> | null = null;

export function buildDbServices(){
  if(_containerPromise) return _containerPromise;
  _containerPromise = (async () => {
    const db = getDb(); // fuerza inicialización
    logPoolStatsOnce(); // imprime una vez en dev
    
    // Existing repos
    const products = new DrizzleProductsRepo(db as DrizzleDb);
    const tiers = new DrizzleTiersRepo(db as DrizzleDb);
    const categories = new DrizzleCategoryRulesRepo(db as DrizzleDb);
    const params = new DrizzleParamsRepo(db as DrizzleDb);
    const providers = new DrizzleProvidersRepo(db as DrizzleDb);
    const audit = new DrizzleAuditRepo(db as DrizzleDb);
    const priceCacheRepo = new DrizzlePriceCacheRepo(db as DrizzleDb);
    
    // New repos for Phase 2
    const purchases = new DrizzlePurchasesRepository(db as DrizzleDb);
    const priceBook = new DrizzlePriceBookRepository(db as DrizzleDb);
    
    // Services
    const pricing = new PricingService({ products, tiers, categories, params });
    const purchaseService = new PurchaseService(purchases, priceBook);
    const priceBookService = new PriceBookService(priceBook, products);
    const xlsxImporter = new XLSXImporterService(purchaseService);
    
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
    
    return { 
      db, 
      repos: { 
        products, 
        tiers, 
        categories, 
        params, 
        providers, 
        audit, 
        priceCache: priceCacheRepo,
        purchases,
        priceBook
      }, 
      services: { 
        pricing: cachedPricing,
        purchases: purchaseService,
        priceBook: priceBookService,
        xlsxImporter
      } 
    } as Container;
  })();
  return _containerPromise;
}
