import { computePrice } from '@/lib/pricing/compute';
import { describe, it, expect } from 'vitest';
import { Product, Tier, PriceParams } from '@/lib/pricing/types';

describe('edge tiny area rounding', () => {
  const product:Product = { sku:'EA', name:'Edge', category:'X', providerId:'p', cost_sqft:1, area_sqft:0.01, active_tier:1, active:true };
  const tier:Tier = { id:1, mult:3.5, number_of_layers:1 };
  const params:PriceParams = { ink_price:0, lamination_price:0, cut_price:0, rounding_step:0.05 };
  it('rounds up minimally', () => {
    const br = computePrice({ product, tier, params, toggles:{ ink:false, lam:false, cut:false } });
    expect(br.final).toBeGreaterThan(0);
  });
});
