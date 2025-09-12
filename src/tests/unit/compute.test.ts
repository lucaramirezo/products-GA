import { computePrice } from '@/lib/pricing/compute';
import { describe, it, expect } from 'vitest';
import { ComputeContext, PriceParams, Product, Tier } from '@/lib/pricing/types';

const tier:Tier = { id:1, mult:3.5, number_of_layers:1 };
const params:PriceParams = { ink_price:0.5, lamination_price:0.2, cut_price:1, rounding_step:0.05 };
function prod(p:Partial<Product>={}):Product{ return { sku:'S', name:'N', category:'Cat', providerId:'prov', cost_sqft:1, area_sqft:1, active_tier:1, active:true, ink_enabled:true, lam_enabled:true, cut_enabled:true, ...p }; }

describe('computePrice', () => {
  it('no addons when toggles false', () => {
    const ctx:ComputeContext = { product: prod(), tier, params, toggles:{ink:false, lam:false, cut:false} };
    const br = computePrice(ctx);
    expect(br.addons_total).toBe(0);
  });
  it('adds ink lam cut', () => {
    const ctx:ComputeContext = { product: prod(), tier, params, toggles:{ink:true, lam:true, cut:true} };
    const br = computePrice(ctx);
    expect(br.ink_add).toBeGreaterThan(0); expect(br.lam_add).toBeGreaterThan(0); expect(br.cut_add).toBeGreaterThan(0);
  });
  it('new formula without min logic', () => {
    const lowCost = prod({ cost_sqft:0.1 });
    const ctx:ComputeContext = { product: lowCost, tier:{...tier, mult:1}, params, toggles:{ink:false, lam:false, cut:false} };
    const br = computePrice(ctx);
    // With new formula, no minimum logic, so should just be base + addons rounded up
    expect(br.final).toBeGreaterThan(0);
    expect(br.base_total).toBe(0.1); // cost_sqft * mult * area = 0.1 * 1 * 1
  });
});
