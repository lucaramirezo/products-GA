import { AuditRepo, AuditEntry } from '../interfaces';
import { DrizzleDb } from '@/db/types';
import { auditLog } from '@/db/schema';
import { desc } from 'drizzle-orm';

export class DrizzleAuditRepo implements AuditRepo {
  constructor(private db:DrizzleDb){}
  async insert(entries:AuditEntry[]){
    if(!entries.length) return;
    await this.db.insert(auditLog).values(entries.map(e=>({
      entity: e.entity,
      entityId: e.id,
      field: e.field,
      before: e.before ?? null,
      after: e.after ?? null,
      userId: e.user || 'system'
    })));
  }
  async latest(limit:number){
  const rows: Array<{ entity:string; entityId:string; field:string; before:unknown; after:unknown; at:Date; userId:string|null }> = await this.db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(limit);
  return rows.map(r=>({ entity:r.entity, id:r.entityId, field:r.field, before:r.before, after:r.after, date: (r.at instanceof Date)? r.at.toISOString(): r.at, user: r.userId || 'system' }));
  }
}
