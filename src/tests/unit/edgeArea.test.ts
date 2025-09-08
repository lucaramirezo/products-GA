import { computePrice } from '@/lib/pricing/compute';
import { describe, it, expect } from 'vitest';
import { Product, Tier, PriceParams } from '@/lib/pricing/types';

describe('edge tiny area rounding', () => {
  const product:Product = { sku:'EA', name:'Edge', category:'X', providerId:'p', cost_sqft:1, area_sqft:0.01, active_tier:1, active:true } as any;
  const tier:Tier = { id:1, mult:3.5, ink_factor:1 };
  const params:PriceParams = { ink_price:0, lamination_price:0, cut_price:0, cut_unit:'per_sqft', rounding_step:0.05, min_pvp_global:0 };
  it('rounds up minimally', () => {
    const br = computePrice({ product, tier, params, toggles:{ ink:false, lam:false, cut:false } });
    expect(br.final).toBeGreaterThan(0);
  });
});
