import { computePrice } from '@/lib/pricing/compute';
import { PriceBreakdown } from '@/lib/pricing/types';
import { ProductsRepo, TiersRepo, CategoryRulesRepo, ParamsRepo } from '@/repositories/interfaces';

export class PricingService {
  constructor(private deps:{ products:ProductsRepo; tiers:TiersRepo; categories:CategoryRulesRepo; params:ParamsRepo }){}

  async getPriceBySku(sku:string, toggles:{ ink:boolean; lam:boolean; cut:boolean; sheets?:number;}):Promise<PriceBreakdown>{
    const product = await this.deps.products.getBySku(sku);
    if(!product || !product.active || product.deleted_at) throw new Error('Producto no encontrado o inactivo');
    const tier = await this.deps.tiers.get(product.active_tier);
    if(!tier) throw new Error('Tier no encontrado');
    const rule = await this.deps.categories.get(product.category) || undefined;
    const params = await this.deps.params.get();
    return computePrice({ product, tier, categoryRule:rule, params, toggles, sheets_override: toggles.sheets });
  }
}
