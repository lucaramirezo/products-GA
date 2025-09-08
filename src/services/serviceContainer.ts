import { InMemoryProductsRepo } from '@/repositories/memory/productsRepo';
import { InMemoryTiersRepo } from '@/repositories/memory/tiersRepo';
import { InMemoryCategoryRulesRepo } from '@/repositories/memory/categoryRulesRepo';
import { InMemoryParamsRepo } from '@/repositories/memory/paramsRepo';
import { InMemoryProvidersRepo } from '@/repositories/memory/providersRepo';
import { InMemoryAuditRepo } from '@/repositories/memory/auditRepo';
import { PricingService } from './pricingService';
import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';

export interface SeedData { products:Product[]; tiers:Tier[]; categoryRules:CategoryRule[]; params:PriceParams; providers:{id:string;name:string;lastUpdate?:string}[]; }

export function buildInMemoryServices(seed:SeedData){
  const products = new InMemoryProductsRepo([...seed.products]);
  const tiers = new InMemoryTiersRepo([...seed.tiers]);
  const categories = new InMemoryCategoryRulesRepo([...seed.categoryRules]);
  const params = new InMemoryParamsRepo({ ...seed.params });
  const providers = new InMemoryProvidersRepo([...seed.providers]);
  const audit = new InMemoryAuditRepo();
  const pricing = new PricingService({ products, tiers, categories, params });
  return { repos:{ products, tiers, categories, params, providers, audit }, services:{ pricing } };
}
