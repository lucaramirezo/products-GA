import { ComputeContext, PriceBreakdown } from './types';
import { roundUp } from './rounding';
import { resolveEffective } from './precedence';

export function computePrice(ctx:ComputeContext): PriceBreakdown {
  const { product, tier, params, categoryRule, toggles, sheets_override } = ctx;
  const eff = resolveEffective({ product, tier, categoryRule, params });
  const area = Math.max(product.area_sqft || 1, 0.0001);
  
  // Base material cost: cost_sqft × multiplier × area
  const base_per_sqft = product.cost_sqft * eff.mult;
  const base_total = base_per_sqft * area;
  
  // Add-ons: ink and lamination
  const ink_add = toggles.ink && product.ink_enabled ? params.ink_price * eff.number_of_layers * area : 0;
  const lam_add = toggles.lam && product.lam_enabled ? params.lamination_price * area : 0;
  
  // New cutting logic: only applies when sell_mode = SQFT
  let cut_add = 0;
  if (toggles.cut && product.cut_enabled && product.sell_mode === 'SQFT') {
    // cut_add = cut_factor × (base_material_price) where base_material_price = cost_sqft × multiplier × area
    cut_add = params.cut_factor * base_total;
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
