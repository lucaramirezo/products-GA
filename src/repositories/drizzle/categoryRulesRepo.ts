import { CategoryRulesRepo } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { categoryRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mapCategoryRule } from './mappers';

export class DrizzleCategoryRulesRepo implements CategoryRulesRepo {
  constructor(private db:DrizzleDb){}
  async list(){ const rows = await this.db.select().from(categoryRules); return rows.map(mapCategoryRule); }
  async get(category:string){ const [row] = await this.db.select().from(categoryRules).where(eq(categoryRules.category, category)); return row? mapCategoryRule(row): null; }
  async upsert(rule: { category:string; override_multiplier?:number; override_number_of_layers?:number }){
    const values = {
      category: rule.category,
      overrideMultiplier: rule.override_multiplier ?? null,
      overrideNumberOfLayers: rule.override_number_of_layers ?? null
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins: any = this.db.insert(categoryRules).values(values);
  if(ins.onConflictDoUpdate){ await ins.onConflictDoUpdate({ target: categoryRules.category, set: values }); }
  }
  async delete(category:string){ await this.db.delete(categoryRules).where(eq(categoryRules.category, category)); }
}
