import { ProvidersRepo } from '../interfaces';

export interface Provider { id:string; name:string; lastUpdate?:string; }

export class InMemoryProvidersRepo implements ProvidersRepo {
  constructor(private providers:Provider[]){ }
  list(){ return Promise.resolve(this.providers); }
  get(id:string){ return Promise.resolve(this.providers.find(p=>p.id===id) || null); }
  async upsert(p:Provider){
    const idx = this.providers.findIndex(x=>x.id===p.id);
    if(idx>=0) this.providers[idx] = { ...this.providers[idx], ...p }; else this.providers.push(p);
  }
}
