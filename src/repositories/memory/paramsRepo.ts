import { ParamsRepo } from '../interfaces';
import { PriceParams } from '@/lib/pricing/types';

export class InMemoryParamsRepo implements ParamsRepo {
  constructor(private params:PriceParams){ }
  async get(){ return this.params; }
  async update(patch:Partial<PriceParams>){ Object.assign(this.params, patch, { updated_at:new Date().toISOString() }); return this.params; }
}
