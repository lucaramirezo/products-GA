import { TiersRepo } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { tiers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mapTier } from './mappers';

export class DrizzleTiersRepo implements TiersRepo {
  constructor(private db:DrizzleDb){}
  async list(){ const rows = await this.db.select().from(tiers); return rows.map(mapTier); }
  async get(id:number){ const [row] = await this.db.select().from(tiers).where(eq(tiers.id, id)); return row? mapTier(row): null; }
  async update(id:number, patch:Partial<{ mult:number; number_of_layers:number; }>){
  const set:Record<string,unknown> = {};
    if(patch.mult!==undefined) set.mult = patch.mult;
    if(patch.number_of_layers!==undefined) set.numberOfLayers = patch.number_of_layers;
    if(Object.keys(set).length) await this.db.update(tiers).set(set).where(eq(tiers.id, id));
    const updated = await this.get(id); if(!updated) throw new Error('Tier not found'); return updated;
  }
}
