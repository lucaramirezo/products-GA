import { getDb } from '@/db/client';
import { products, tiers, priceParams, categoryRules, providers, auditLog } from '@/db/schema';
import { desc, isNull } from 'drizzle-orm';
import type { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';

export type Provider = { 
  id: string; 
  name: string; 
  lastUpdate?: string 
};

export type AuditEntry = { 
  entity: string; 
  id: string; 
  field: string; 
  before: unknown; 
  after: unknown; 
  date: string; 
  user: string 
};

export type InitialData = {
  products: Product[];
  tiers: Tier[];
  params: PriceParams;
  categoryRules: CategoryRule[];
  providers: Provider[];
  auditLog: AuditEntry[];
};

export async function getInitialData(): Promise<InitialData> {
  const db = getDb();
  
  try {
    const [
      productsData,
      tiersData,
      paramsData,
      categoryRulesData,
      providersData,
      auditData
    ] = await Promise.all([
      // Get all active products
      db.select().from(products).where(isNull(products.deletedAt)),
      
      // Get all tiers
      db.select().from(tiers).orderBy(tiers.id),
      
      // Get price params (singleton)
      db.select().from(priceParams).limit(1),
      
      // Get all category rules
      db.select().from(categoryRules),
      
      // Get all providers
      db.select().from(providers),
      
      // Get latest 200 audit entries
      db.select().from(auditLog)
        .orderBy(desc(auditLog.at))
        .limit(200)
    ]);

    // Transform DB data to match expected types
    const transformedProducts: Product[] = productsData.map((p: typeof products.$inferSelect) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      providerId: p.providerId,
      cost_sqft: Number(p.costSqft),
      area_sqft: Number(p.areaSqft),
      active_tier: p.activeTier,
      min_pvp: p.minPvp ? Number(p.minPvp) : undefined,
      override_multiplier: p.overrideMultiplier ? Number(p.overrideMultiplier) : undefined,
      override_ink_factor: p.overrideInkFactor ?? undefined,
      ink_enabled: p.inkEnabled,
      lam_enabled: p.lamEnabled,
      cut_enabled: p.cutEnabled,
      sheets_count: p.sheetsCount ?? undefined,
      active: p.active
    }));

    const transformedTiers: Tier[] = tiersData.map((t: typeof tiers.$inferSelect) => ({
      id: t.id,
      mult: Number(t.mult),
      ink_factor: t.inkFactor
    }));

    // Handle case where no params exist yet (use defaults)
    const defaultParams: PriceParams = {
      ink_price: 0.55,
      lamination_price: 0,
      cut_price: 0,
      cut_unit: "per_sqft",
      rounding_step: 0.05,
      min_pvp_global: 0,
      cost_method: "latest"
    };

    const transformedParams: PriceParams = paramsData.length > 0 ? {
      ink_price: Number(paramsData[0].inkPrice),
      lamination_price: Number(paramsData[0].laminationPrice),
      cut_price: Number(paramsData[0].cutPrice),
      cut_unit: paramsData[0].cutUnit as "per_sqft" | "per_sheet",
      rounding_step: Number(paramsData[0].roundingStep),
      min_pvp_global: paramsData[0].minPvpGlobal ? Number(paramsData[0].minPvpGlobal) : 0,
      cost_method: paramsData[0].costMethod as "latest"
    } : defaultParams;

    const transformedCategoryRules: CategoryRule[] = categoryRulesData.map((r: typeof categoryRules.$inferSelect) => ({
      category: r.category,
      min_pvp: r.minPvp ? Number(r.minPvp) : undefined,
      override_multiplier: r.overrideMultiplier ? Number(r.overrideMultiplier) : undefined,
      override_ink_factor: r.overrideInkFactor ?? undefined
    }));

    const transformedProviders: Provider[] = providersData.map((p: typeof providers.$inferSelect) => ({
      id: p.id,
      name: p.name,
      lastUpdate: p.lastUpdate?.toISOString()
    }));

    const transformedAudit: AuditEntry[] = auditData.map((a: typeof auditLog.$inferSelect) => ({
      entity: a.entity,
      id: a.entityId,
      field: a.field,
      before: a.before,
      after: a.after,
      date: a.at.toISOString(),
      user: a.userId || "admin"
    }));

    return {
      products: transformedProducts,
      tiers: transformedTiers,
      params: transformedParams,
      categoryRules: transformedCategoryRules,
      providers: transformedProviders,
      auditLog: transformedAudit
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    
    // Return default data if DB query fails (for development)
    return {
      products: [],
      tiers: [
        { id: 1, mult: 3.5, ink_factor: 1 },
        { id: 2, mult: 4.0, ink_factor: 1 },
        { id: 3, mult: 4.3, ink_factor: 2 },
        { id: 4, mult: 4.5, ink_factor: 2 },
        { id: 5, mult: 5.0, ink_factor: 2 }
      ],
      params: {
        ink_price: 0.55,
        lamination_price: 0,
        cut_price: 0,
        cut_unit: "per_sqft",
        rounding_step: 0.05,
        min_pvp_global: 0,
        cost_method: "latest"
      },
      categoryRules: [],
      providers: [],
      auditLog: []
    };
  }
}
