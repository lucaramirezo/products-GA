import { computePrice } from '@/lib/pricing/compute';
import { describe, it, expect } from 'vitest';
import { ComputeContext, PriceParams, Product, Tier } from '@/lib/pricing/types';

const tier:Tier = { id:1, mult:3.5, number_of_layers:1 };
const params:PriceParams = { ink_price:0.5, lamination_price:0.2, cut_price:1, cut_factor:0.25, rounding_step:0.05 };
function prod(p:Partial<Product>={}):Product{ return { sku:'S', name:'N', category:'Cat', providerId:'prov', cost_sqft:1, area_sqft:1, active_tier:1, sell_mode:'SQFT', active:true, ink_enabled:true, lam_enabled:true, cut_enabled:true, ...p }; }

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

  it('cutting applies only to SQFT mode', () => {
    const sqftProduct = prod({ sell_mode: 'SQFT', cost_sqft: 4, area_sqft: 2 });
    const sheetProduct = prod({ sell_mode: 'SHEET', cost_sqft: 4, area_sqft: 2 });
    
    // For SQFT mode, cutting should apply: cut_factor * (cost_sqft * mult * area)
    const sqftCtx:ComputeContext = { product: sqftProduct, tier, params, toggles:{ink:false, lam:false, cut:true} };
    const sqftResult = computePrice(sqftCtx);
    
    // Expected cut_add = 0.25 * (4 * 3.5 * 2) = 0.25 * 28 = 7
    expect(sqftResult.cut_add).toBe(7);
    
    // For SHEET mode, cutting should NOT apply
    const sheetCtx:ComputeContext = { product: sheetProduct, tier, params, toggles:{ink:false, lam:false, cut:true} };
    const sheetResult = computePrice(sheetCtx);
    
    expect(sheetResult.cut_add).toBe(0);
  });

  it('new cutting formula: cut_factor × base_material_price', () => {
    const product = prod({ sell_mode: 'SQFT', cost_sqft: 2, area_sqft: 3 });
    const testParams = { ...params, cut_factor: 0.3 }; // 30%
    const ctx:ComputeContext = { product, tier, params: testParams, toggles:{ink:false, lam:false, cut:true} };
    const result = computePrice(ctx);
    
    // Base material price = cost_sqft * mult * area = 2 * 3.5 * 3 = 21
    // Cut add = cut_factor * base_material_price = 0.3 * 21 = 6.3
    expect(result.cut_add).toBe(6.3);
  });
});
