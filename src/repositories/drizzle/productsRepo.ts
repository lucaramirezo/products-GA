import { eq, and, isNull } from 'drizzle-orm';
import { ProductsRepo } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { products } from '@/db/schema';
import { mapProduct } from './mappers';
import { Product } from '@/lib/pricing/types';

export class DrizzleProductsRepo implements ProductsRepo {
  constructor(private db:DrizzleDb){}

  async list(){
    const rows = await this.db.select().from(products).where(and(eq(products.active, true), isNull(products.deletedAt)));
    return rows.map(mapProduct);
  }
  async getBySku(sku:string){
    const [row] = await this.db.select().from(products).where(eq(products.sku, sku));
    return row? mapProduct(row) : null;
  }
  async upsert(p:Product){
    // Convert domain -> DB column mapping
    const values = {
      sku: p.sku,
      name: p.name,
      category: p.category,
      providerId: p.providerId,
      costSqft: p.cost_sqft,
      areaSqft: p.area_sqft,
      activeTier: p.active_tier,
      overrideMultiplier: p.override_multiplier ?? null,
      overrideNumberOfLayers: p.override_number_of_layers ?? null,
      inkEnabled: p.ink_enabled ?? true,
      lamEnabled: p.lam_enabled ?? false,
      cutEnabled: p.cut_enabled ?? false,
      sellMode: p.sell_mode || 'SQFT',
      sheetsCount: p.sheets_count ?? null,
      active: p.active ?? true
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins: any = this.db.insert(products).values(values);
  if(ins.onConflictDoUpdate){ await ins.onConflictDoUpdate({ target: products.sku, set: values }); }
  }
  async updatePartial(sku:string, patch:Partial<Product>){
    const set:Record<string,unknown> = {};
    if(patch.name!==undefined) set.name = patch.name;
    if(patch.category!==undefined) set.category = patch.category;
    if(patch.providerId!==undefined) set.providerId = patch.providerId;
    if(patch.cost_sqft!==undefined) set.costSqft = patch.cost_sqft;
    if(patch.area_sqft!==undefined) set.areaSqft = patch.area_sqft;
    if(patch.active_tier!==undefined) set.activeTier = patch.active_tier;
    if(patch.override_multiplier!==undefined) set.overrideMultiplier = patch.override_multiplier ?? null;
    if(patch.override_number_of_layers!==undefined) set.overrideNumberOfLayers = patch.override_number_of_layers ?? null;
    if(patch.ink_enabled!==undefined) set.inkEnabled = patch.ink_enabled;
    if(patch.lam_enabled!==undefined) set.lamEnabled = patch.lam_enabled;
    if(patch.cut_enabled!==undefined) set.cutEnabled = patch.cut_enabled;
    if(patch.sell_mode!==undefined) set.sellMode = patch.sell_mode;
    if(patch.sheets_count!==undefined) set.sheetsCount = patch.sheets_count ?? null;
    if(patch.active!==undefined) set.active = patch.active;
    if(Object.keys(set).length===0) return (await this.getBySku(sku))!;
    await this.db.update(products).set(set).where(eq(products.sku, sku));
    const updated = await this.getBySku(sku); if(!updated) throw new Error('Product not found after update');
    return updated;
  }
  async softDelete(sku:string){
    await this.db.update(products).set({ deletedAt: new Date() }).where(eq(products.sku, sku));
  }
}
