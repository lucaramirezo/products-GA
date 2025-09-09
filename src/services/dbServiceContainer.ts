import { DrizzleProductsRepo } from '@/repositories/drizzle/productsRepo';
import { DrizzleTiersRepo } from '@/repositories/drizzle/tiersRepo';
import { DrizzleCategoryRulesRepo } from '@/repositories/drizzle/categoryRulesRepo';
import { DrizzleParamsRepo } from '@/repositories/drizzle/paramsRepo';
import { DrizzleProvidersRepo } from '@/repositories/drizzle/providersRepo';
import { DrizzleAuditRepo } from '@/repositories/drizzle/auditRepo';
import { DrizzlePriceCacheRepo } from '@/repositories/drizzle/priceCacheRepo';
import { PricingService } from './pricingService';
import { createDbClient } from '@/db/client';
import { pricingCache } from './cacheService';

import { DrizzleDb } from '@/db/types';
import { PriceBreakdown } from '@/lib/pricing/types';
interface PricingLike { getPriceBySku: (sku:string, toggles:{ink:boolean;lam:boolean;cut:boolean;sheets?:number;})=>Promise<PriceBreakdown>; }
interface Container { db:DrizzleDb; client:import('pg').Client; repos:{ products:unknown; tiers:unknown; categories:unknown; params:unknown; providers:unknown; audit:unknown; priceCache:unknown }; services:{ pricing: PricingLike } }
let _containerPromise: Promise<Container> | null = null;

export function buildDbServices(){
  if(_containerPromise) return _containerPromise;
  _containerPromise = (async () => {
    const { client, db } = createDbClient();
    await client.connect();
    // Repos
    const products = new DrizzleProductsRepo(db as DrizzleDb);
    const tiers = new DrizzleTiersRepo(db as DrizzleDb);
    const categories = new DrizzleCategoryRulesRepo(db as DrizzleDb);
    const params = new DrizzleParamsRepo(db as DrizzleDb);
    const providers = new DrizzleProvidersRepo(db as DrizzleDb);
    const audit = new DrizzleAuditRepo(db as DrizzleDb);
    const priceCacheRepo = new DrizzlePriceCacheRepo(db as DrizzleDb);
    const pricing = new PricingService({ products, tiers, categories, params });
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
    return { db, client, repos:{ products, tiers, categories, params, providers, audit, priceCache: priceCacheRepo }, services:{ pricing: cachedPricing } } as Container;
  })();
  return _containerPromise;
}
