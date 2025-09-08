import { CategoryRulesRepo } from '../interfaces';
import { CategoryRule } from '@/lib/pricing/types';

export class InMemoryCategoryRulesRepo implements CategoryRulesRepo {
  constructor(private rules:CategoryRule[]){ }
  list(){ return Promise.resolve(this.rules); }
  get(category:string){ return Promise.resolve(this.rules.find(r=>r.category===category) || null); }
  async upsert(rule:CategoryRule){
    const idx = this.rules.findIndex(r=>r.category===rule.category);
    if(idx>=0) this.rules[idx] = { ...this.rules[idx], ...rule }; else this.rules.push(rule);
  }
  async delete(category:string){
    const idx = this.rules.findIndex(r=>r.category===category); if(idx>=0) this.rules.splice(idx,1);
  }
}
