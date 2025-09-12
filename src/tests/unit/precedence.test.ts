import { resolveEffective } from '@/lib/pricing/precedence';
import { describe, it, expect } from 'vitest';
import { CategoryRule, PriceParams, Product, Tier } from '@/lib/pricing/types';

const tier:Tier = { id:1, mult:3.5, number_of_layers:1 };
const params:PriceParams = { ink_price:0.5, lamination_price:0, cut_price:0, rounding_step:0.05 };

function baseProd(p:Partial<Product>={}):Product{ return { sku:'S', name:'N', category:'Cat', providerId:'prov', cost_sqft:1, area_sqft:1, active_tier:1, active:true, ink_enabled:true, ...p }; }

describe('resolveEffective precedence', () => {
  it('tier only', () => {
    const eff = resolveEffective({ product: baseProd(), tier, params });
    expect(eff.mult).toBe(tier.mult);
    expect(eff.number_of_layers).toBe(tier.number_of_layers);
  });
  it('category override', () => {
    const cat:CategoryRule = { category:'Cat', override_multiplier:4, override_number_of_layers:2 };
    const eff = resolveEffective({ product: baseProd(), tier, params, categoryRule:cat });
    expect(eff.mult).toBe(4); expect(eff.number_of_layers).toBe(2);
  });
  it('product override beats category', () => {
    const cat:CategoryRule = { category:'Cat', override_multiplier:4, override_number_of_layers:2 };
    const eff = resolveEffective({ product: baseProd({ override_multiplier:5, override_number_of_layers:3 }), tier, params, categoryRule:cat });
    expect(eff.mult).toBe(5); expect(eff.number_of_layers).toBe(3);
  });
  it('new formula has no min precedence logic', () => {
    const eff = resolveEffective({ product: baseProd(), tier, params });
    // New formula doesn't have min_per_sqft logic
    expect(eff.sources).toContain('tier.mult');
    expect(eff.sources).toContain('tier.number_of_layers');
  });
});
