import { ParamsRepo } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { priceParams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mapParams } from './mappers';

export class DrizzleParamsRepo implements ParamsRepo {
  constructor(private db:DrizzleDb){}
  async get(){ const [row] = await this.db.select().from(priceParams); if(!row) throw new Error('price_params missing'); return mapParams(row); }
  async update(patch: Partial<{ ink_price:number; lamination_price:number; cut_price:number; cut_factor:number; rounding_step:number; cost_method?:string; default_tier?:number }>){
    const set:Record<string,unknown> = {};
    if(patch.ink_price!==undefined) set.inkPrice = patch.ink_price;
    if(patch.lamination_price!==undefined) set.laminationPrice = patch.lamination_price;
    if(patch.cut_price!==undefined) set.cutPrice = patch.cut_price;
    if(patch.cut_factor!==undefined) set.cutFactor = patch.cut_factor;
    if(patch.rounding_step!==undefined) set.roundingStep = patch.rounding_step;
    if(patch.cost_method!==undefined) set.costMethod = patch.cost_method;
    if(patch.default_tier!==undefined) set.defaultTier = patch.default_tier;
  if(Object.keys(set).length) await this.db.update(priceParams).set(set).where(eq(priceParams.id, 1));
    return this.get();
  }
}
