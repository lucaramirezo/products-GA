import { Product, Tier, CategoryRule, PriceParams } from './types';
import { computePrice } from './compute';

export interface PricedProductRow {
  product: Product;
  catRule?: CategoryRule;
  override: { mult:number; ink_factor:number; source:'product'|'category' } | null;
  activePricing: {
    base_per_sqft:number; base_total:number; ink_add:number; lam_add:number; cut_add:number; addons_total:number; pvp_raw:number; min_total:number; final:number; min_applied:boolean;
  };
  tiersPreview: { tier:number; final:number }[];
  finalPrice:number;
  finalSource:string;
  margin:number;
  lowMargin:boolean;
}

export function buildPricedProductRow(args:{ product:Product; tiers:Tier[]; params:PriceParams; categoryRule?:CategoryRule; }):PricedProductRow {
  const { product, tiers, params, categoryRule } = args;
  const activeTier = tiers.find(t=>t.id===product.active_tier);
  if(!activeTier) throw new Error('Active tier not found');
  const toggles = { ink: !!product.ink_enabled, lam: !!product.lam_enabled, cut: !!product.cut_enabled };
  const breakdown = computePrice({ product, tier: activeTier, params, categoryRule, toggles });
  let override:PricedProductRow['override'] = null;
  if(breakdown.effective.sources.some(s=>s==='product.mult') || breakdown.effective.sources.some(s=>s==='category.mult')){
    const isProduct = breakdown.effective.sources.includes('product.mult');
    override = { mult: breakdown.effective.mult, ink_factor: breakdown.effective.ink_factor, source: isProduct ? 'product' : 'category' };
  }
  const tiersPreview = tiers.map(t=>({ tier: t.id, final: computePrice({ product, tier: t, params, categoryRule, toggles }).final }));
  const finalSource = override ? (override.source==='product' ? 'Override producto' : 'Override categoría') : `Tier ${product.active_tier}`;
  const finalPrice = breakdown.final;
  const pvp_raw = breakdown.base_total + breakdown.addons_total;
  const activePricing = {
    base_per_sqft: breakdown.base_per_sqft,
    base_total: breakdown.base_total,
    ink_add: breakdown.ink_add,
    lam_add: breakdown.lam_add,
    cut_add: breakdown.cut_add,
    addons_total: breakdown.addons_total,
    pvp_raw,
    min_total: breakdown.min_total,
    final: breakdown.final,
    min_applied: breakdown.applied_min
  };
  const margin = finalPrice>0 ? (finalPrice - product.cost_sqft*product.area_sqft)/finalPrice : 0;
  return { product, catRule: categoryRule, override, activePricing, tiersPreview, finalPrice, finalSource, margin, lowMargin: margin<0.15 };
}
