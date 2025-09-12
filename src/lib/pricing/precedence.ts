import { CategoryRule, Effective, PriceParams, Product, Tier } from './types';

export function resolveEffective(ctx:{product:Product; tier:Tier; categoryRule?:CategoryRule; params:PriceParams;}): Effective {
  const { product, tier, categoryRule } = ctx;
  const sources:string[] = [];
  const mult = product.override_multiplier ?? (categoryRule?.override_multiplier) ?? tier.mult;
  if(product.override_multiplier!=null) sources.push('product.mult');
  else if(categoryRule?.override_multiplier!=null) sources.push('category.mult');
  else sources.push('tier.mult');

  const number_of_layers = product.override_number_of_layers ?? (categoryRule?.override_number_of_layers) ?? tier.number_of_layers;
  if(product.override_number_of_layers!=null) sources.push('product.number_of_layers');
  else if(categoryRule?.override_number_of_layers!=null) sources.push('category.number_of_layers');
  else sources.push('tier.number_of_layers');

  return { mult, number_of_layers, sources };
}
