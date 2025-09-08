import { TiersRepo } from '../interfaces';
import { Tier } from '@/lib/pricing/types';

export class InMemoryTiersRepo implements TiersRepo {
  constructor(private tiers:Tier[]){ }
  list(){ return Promise.resolve(this.tiers); }
  get(id:number){ return Promise.resolve(this.tiers.find(t=>t.id===id) || null); }
  async update(id:number, patch:Partial<Tier>){
    const t = await this.get(id); if(!t) throw new Error('Tier not found');
    Object.assign(t, patch); return t;
  }
}
