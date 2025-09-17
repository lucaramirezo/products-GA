import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import { products, tiers, categoryRules, priceParams, providers, auditLog } from '@/db/schema';

// Map DB rows (camel case fields in schema objects) to domain types expected by existing code.
// Drizzle returns field names as defined in schema (camelCase) but DB columns are snake_case.

interface ProductRow { sku:string; name:string; category:string; providerId:string; costSqft:string|number; areaSqft:string|number; activeTier:number; overrideMultiplier:string|number|null; overrideNumberOfLayers:number|null; inkEnabled:boolean; lamEnabled:boolean; cutEnabled:boolean; sellMode:'SQFT'|'SHEET'; sheetsCount:number|null; active:boolean; deletedAt: string|null; createdAt:string; updatedAt:string }
export function mapProduct(row: ProductRow): Product {
  return {
    sku: row.sku,
    name: row.name,
    category: row.category,
    providerId: row.providerId,
    cost_sqft: numberOr(row.costSqft),
    area_sqft: numberOr(row.areaSqft),
    active_tier: row.activeTier,
    override_multiplier: numberOr(row.overrideMultiplier, undefined),
    override_number_of_layers: row.overrideNumberOfLayers ?? undefined,
    ink_enabled: row.inkEnabled ?? true,
    lam_enabled: row.lamEnabled ?? false,
    cut_enabled: row.cutEnabled ?? false,
    sell_mode: row.sellMode || 'SQFT',
    sheets_count: row.sheetsCount ?? undefined,
    active: row.active,
    deleted_at: row.deletedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  } as Product;
}

interface TierRow { id:number; mult:string|number; numberOfLayers:number }
export function mapTier(row:TierRow): Tier {
  return { id: row.id, mult: numberOr(row.mult)!, number_of_layers: row.numberOfLayers };
}

interface CategoryRuleRow { category:string; overrideMultiplier:string|number|null; overrideNumberOfLayers:number|null }
export function mapCategoryRule(row:CategoryRuleRow): CategoryRule {
  return {
    category: row.category,
    override_multiplier: numberOr(row.overrideMultiplier, undefined),
    override_number_of_layers: row.overrideNumberOfLayers ?? undefined
  };
}

interface ParamsRow { inkPrice:string|number; laminationPrice:string|number; cutPrice:string|number; cutFactor:string|number; roundingStep:string|number; costMethod:string; defaultTier:number; createdAt?:string; updatedAt?:string }
export function mapParams(row:ParamsRow): PriceParams {
  return {
    ink_price: numberOr(row.inkPrice)!,
    lamination_price: numberOr(row.laminationPrice)!,
    cut_price: numberOr(row.cutPrice)!,
    cut_factor: numberOr(row.cutFactor)!,
    rounding_step: numberOr(row.roundingStep)!,
    cost_method: row.costMethod,
    default_tier: row.defaultTier,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  };
}

function numberOr(v:unknown, fallback?:number): number | undefined { if(v==null) return fallback; if(typeof v === 'number') return v; const n = Number(v); return isNaN(n)? fallback : n; }

export const schemaRefs = { products, tiers, categoryRules, priceParams, providers, auditLog };
