import { CategoryRule, Effective, PriceParams, Product, Tier } from './types';

export function resolveEffective(ctx:{product:Product; tier:Tier; categoryRule?:CategoryRule; params:PriceParams;}): Effective {
  const { product, tier, categoryRule, params } = ctx;
  const sources:string[] = [];
  const mult = product.override_multiplier ?? (categoryRule?.override_multiplier) ?? tier.mult;
  if(product.override_multiplier!=null) sources.push('product.mult');
  else if(categoryRule?.override_multiplier!=null) sources.push('category.mult');
  else sources.push('tier.mult');

  const ink_factor = product.override_ink_factor ?? (categoryRule?.override_ink_factor) ?? tier.ink_factor;
  if(product.override_ink_factor!=null) sources.push('product.ink_factor');
  else if(categoryRule?.override_ink_factor!=null) sources.push('category.ink_factor');
  else sources.push('tier.ink_factor');

  const mins = [product.min_pvp, categoryRule?.min_pvp, params.min_pvp_global].filter((x):x is number=>x!=null);
  const min_per_sqft = mins.length ? Math.max(...mins) : undefined;
  if(min_per_sqft!=null){
    if(min_per_sqft === product.min_pvp) sources.push('product.min');
    else if(min_per_sqft === categoryRule?.min_pvp) sources.push('category.min');
    else if(min_per_sqft === params.min_pvp_global) sources.push('global.min');
  }
  return { mult, ink_factor, min_per_sqft, sources };
}
