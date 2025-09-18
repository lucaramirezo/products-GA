import { ProvidersRepo } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { providers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class DrizzleProvidersRepo implements ProvidersRepo {
  constructor(private db:DrizzleDb){}
  async list(){ return await this.db.select().from(providers); }
  async get(id:string){ const [row] = await this.db.select().from(providers).where(eq(providers.id, id)); return row || null; }
  async upsert(p:{id:string; name:string; lastUpdate?:string}){
    const values:Record<string,unknown> = { id: p.id, name: p.name };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins: any = this.db.insert(providers).values(values);
  if(ins.onConflictDoUpdate){ await ins.onConflictDoUpdate({ target: providers.id, set: values }); }
  }
}
