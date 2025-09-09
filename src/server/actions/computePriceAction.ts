"use server";
import { PricingService } from '@/services/pricingService';
import { buildInMemoryServices } from '@/services/serviceContainer';
import { buildDbServices } from '@/services/dbServiceContainer';
import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';

// Temporary singleton (until DB wiring). In real scenario move to a proper server init module.
let _pricingPromise: Promise<PricingService> | null = null;
function ensurePricing(){
  if(_pricingPromise) return _pricingPromise;
  if(process.env.DATABASE_URL){
    _pricingPromise = (async ()=>{
      const dbContainer = await buildDbServices();
      return dbContainer.services.pricing as PricingService;
    })();
  } else {
    _pricingPromise = (async () => {
      const seed = seedData();
      const container = buildInMemoryServices(seed);
      return container.services.pricing as PricingService;
    })();
  }
  return _pricingPromise;
}

function seedData(){
  // Minimal seed mirroring page.tsx initial state
  const tiers:Tier[] = [
    { id:1, mult:3.5, ink_factor:1 },
    { id:2, mult:4.0, ink_factor:1 },
    { id:3, mult:4.3, ink_factor:2 },
    { id:4, mult:4.5, ink_factor:2 },
    { id:5, mult:5.0, ink_factor:2 },
  ];
  const categoryRules:CategoryRule[] = [
    { category:'LargeFormat', min_pvp:6 },
    { category:'Stickers', override_multiplier:4.2, override_ink_factor:2, min_pvp:2 },
  ];
  const params:PriceParams = { ink_price:0.55, lamination_price:0, cut_price:0, cut_unit:'per_sqft', rounding_step:0.05, min_pvp_global:0, cost_method:'latest' };
  const products:Product[] = [
    { sku:'SKU-001', name:'Vinyl Banner 1m²', category:'LargeFormat', providerId:'prov_a', cost_sqft:2.1, area_sqft:1, active_tier:1, min_pvp:5, ink_enabled:true, lam_enabled:false, cut_enabled:false, active:true },
    { sku:'SKU-002', name:'Sticker Pack (10u)', category:'Stickers', providerId:'prov_b', cost_sqft:0.9, area_sqft:1, active_tier:2, override_multiplier:4.6, override_ink_factor:2, ink_enabled:true, lam_enabled:false, cut_enabled:true, active:true },
    { sku:'SKU-003', name:'Canvas Print', category:'LargeFormat', providerId:'prov_a', cost_sqft:3.4, area_sqft:1, active_tier:3, ink_enabled:true, active:true },
  ];
  const providers = [ { id:'prov_a', name:'Proveedor A' }, { id:'prov_b', name:'Proveedor B' } ];
  return { products, tiers, categoryRules, params, providers };
}

export async function computePriceAction(input:{ sku:string; ink?:boolean; lam?:boolean; cut?:boolean; sheets?:number; }){
  const { sku, ink=true, lam=false, cut=false, sheets } = input;
  const pricing = await ensurePricing();
  return pricing.getPriceBySku(sku, { ink, lam, cut, sheets });
}
