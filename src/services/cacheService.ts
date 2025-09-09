export interface Cache<T>{ get(key:string):T|undefined; set(key:string, value:T, ttlMs?:number):void; del(key:string):void; }

interface Entry<V>{ v:V; exp?:number }

export class InMemoryCache<T> implements Cache<T>{
  private store = new Map<string, Entry<T>>();
  constructor(private defaultTtlMs?:number){}
  get(key:string){
    const e = this.store.get(key); if(!e) return undefined;
    if(e.exp && e.exp < Date.now()){ this.store.delete(key); return undefined; }
    return e.v;
  }
  set(key:string, value:T, ttlMs?:number){
    const exp = ttlMs || this.defaultTtlMs ? Date.now() + (ttlMs || this.defaultTtlMs!) : undefined;
    this.store.set(key, { v:value, exp });
  }
  del(key:string){ this.store.delete(key); }
}

// Decision record: We use a tiny local cache for pricing lookups to absorb repeated UI requests.
// Not persistent, invalidated on product/params mutation (to implement when mutations added).
import type { PriceBreakdown } from '@/lib/pricing/types';
export const pricingCache = new InMemoryCache<PriceBreakdown>(5_000); // 5s TTL heuristic
