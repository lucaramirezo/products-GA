import { ComputeContext, PriceBreakdown } from './types';
import { roundUp } from './rounding';
import { resolveEffective } from './precedence';

export function computePrice(ctx:ComputeContext): PriceBreakdown {
  const { product, tier, params, categoryRule, toggles, sheets_override } = ctx;
  const eff = resolveEffective({ product, tier, categoryRule, params });
  const area = Math.max(product.area_sqft || 1, 0.0001);
  
  // New formula: base = (cost_sqft × multiplier × area) + (ink_price × number_of_layers × area) + (lamination_price × area) + (cut_price × sheets_count)
  const base_per_sqft = product.cost_sqft * eff.mult;
  const base_total = base_per_sqft * area;
  const ink_add = toggles.ink && product.ink_enabled ? params.ink_price * eff.number_of_layers * area : 0;
  const lam_add = toggles.lam && product.lam_enabled ? params.lamination_price * area : 0;
  
  // Cutting is only per sheet now
  let cut_add = 0;
  if (toggles.cut && product.cut_enabled) {
    const sheets = sheets_override ?? product.sheets_count ?? area; // simple fallback
    cut_add = params.cut_price * sheets;
  }
  
  const addons_total = ink_add + lam_add + cut_add;
  const base = base_total + addons_total;
  
  // Always round upward to the configured step (no minimum logic)
  const final = roundUp(base, params.rounding_step);
  
  return {
    base_total, addons_total, final, final_per_sqft: final/area,
    effective: eff, ink_add, lam_add, cut_add, base_per_sqft
  };
}

export { resolveEffective };
