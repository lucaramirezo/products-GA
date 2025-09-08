import { resolveEffective } from '@/lib/pricing/precedence';
import { describe, it, expect } from 'vitest';
import { CategoryRule, PriceParams, Product, Tier } from '@/lib/pricing/types';

const tier:Tier = { id:1, mult:3.5, ink_factor:1 };
const params:PriceParams = { ink_price:0.5, lamination_price:0, cut_price:0, cut_unit:'per_sqft', rounding_step:0.05, min_pvp_global:2 };

function baseProd(p:Partial<Product>={}):Product{ return { sku:'S', name:'N', category:'Cat', providerId:'prov', cost_sqft:1, area_sqft:1, active_tier:1, active:true, ink_enabled:true, ...p }; }

describe('resolveEffective precedence', () => {
  it('tier only', () => {
    const eff = resolveEffective({ product: baseProd(), tier, params });
    expect(eff.mult).toBe(tier.mult);
    expect(eff.ink_factor).toBe(tier.ink_factor);
  });
  it('category override', () => {
    const cat:CategoryRule = { category:'Cat', override_multiplier:4, override_ink_factor:2 };
    const eff = resolveEffective({ product: baseProd(), tier, params, categoryRule:cat });
    expect(eff.mult).toBe(4); expect(eff.ink_factor).toBe(2);
  });
  it('product override beats category', () => {
    const cat:CategoryRule = { category:'Cat', override_multiplier:4, override_ink_factor:2 };
    const eff = resolveEffective({ product: baseProd({ override_multiplier:5, override_ink_factor:3 }), tier, params, categoryRule:cat });
    expect(eff.mult).toBe(5); expect(eff.ink_factor).toBe(3);
  });
  it('min precedence global vs product', () => {
    const eff = resolveEffective({ product: baseProd({ min_pvp:3 }), tier, params });
    expect(eff.min_per_sqft).toBe(3);
  });
});
