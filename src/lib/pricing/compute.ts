import { ComputeContext, PriceBreakdown } from './types';
import { roundUp } from './rounding';
import { resolveEffective } from './precedence';

export function computePrice(ctx:ComputeContext): PriceBreakdown {
  const { product, tier, params, categoryRule, toggles, sheets_override } = ctx;
  const eff = resolveEffective({ product, tier, categoryRule, params });
  const area = Math.max(product.area_sqft || 1, 0.0001);
  const base_per_sqft = product.cost_sqft * eff.mult;
  const base_total = base_per_sqft * area;
  const ink_add = toggles.ink && product.ink_enabled ? params.ink_price * eff.ink_factor * area : 0;
  const lam_add = toggles.lam && product.lam_enabled ? params.lamination_price * area : 0;
  let cut_add = 0;
  if (toggles.cut && product.cut_enabled){
    if(params.cut_unit==='per_sqft') cut_add = params.cut_price * area; else {
      const sheets = sheets_override ?? product.sheets_count ?? area; // simple fallback
      cut_add = params.cut_price * sheets;
    }
  }
  const addons_total = ink_add + lam_add + cut_add;
  const pvp_raw = base_total + addons_total;
  const min_total = eff.min_per_sqft ? eff.min_per_sqft * area : 0;
  let applied_min_source: PriceBreakdown['applied_min_source'] = null;
  let applied = pvp_raw;
  if(min_total>pvp_raw){
    applied = min_total;
    // Detect source from effective.sources flags
    const srcMap = eff.sources.find(s=>s.includes('.min'));
    if(srcMap?.startsWith('product')) applied_min_source='product';
    else if(srcMap?.startsWith('category')) applied_min_source='category';
    else if(srcMap?.startsWith('global')) applied_min_source='global';
  }
  const rounded = roundUp(applied, params.rounding_step);
  return {
    base_total, addons_total, min_total, final: rounded, final_per_sqft: rounded/area,
    applied_min: applied!==pvp_raw, applied_min_source: applied_min_source, effective: eff,
    ink_add, lam_add, cut_add, base_per_sqft
  };
}

export { resolveEffective };
