import { ProductsRepo } from '../interfaces';
import { Product } from '@/lib/pricing/types';

export class InMemoryProductsRepo implements ProductsRepo {
  constructor(private data:Product[] = []){}
  list(){ return Promise.resolve(this.data.filter(p=>!p.deleted_at)); }
  getBySku(sku:string){ return Promise.resolve(this.data.find(p=>p.sku===sku) || null); }
  async upsert(p:Product){
    const idx = this.data.findIndex(x=>x.sku===p.sku);
    if(idx>=0) this.data[idx] = { ...this.data[idx], ...p, updated_at: new Date().toISOString() };
    else this.data.unshift({ ...p, created_at:new Date().toISOString(), updated_at:new Date().toISOString() });
  }
  async updatePartial(sku:string, patch:Partial<Product>){
    const existing = await this.getBySku(sku); if(!existing) throw new Error('Product not found');
    const next = { ...existing, ...patch, updated_at:new Date().toISOString() };
    this.data[this.data.findIndex(p=>p.sku===sku)] = next; return next;
  }
  async softDelete(sku:string){
    const existing = await this.getBySku(sku); if(!existing) return;
    existing.deleted_at = new Date().toISOString();
  }
}
