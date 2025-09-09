import { auditLog } from '@/db/schema';
export interface AuditEntry { entity: string; entityId: string; field: string; before: unknown; after: unknown; userId?: string }
interface InsertCapable { insert: (table:unknown)=>{ values(v:unknown[]):unknown } }
export async function persistAuditEntries(db: InsertCapable, entries: AuditEntry[]) {
  if (!entries.length) return;
  await db.insert(auditLog).values(entries.map(e => ({
    entity: e.entity,
    entityId: e.entityId,
    field: e.field,
    before: e.before ?? null,
    after: e.after ?? null,
    userId: e.userId ?? 'system'
  })));
}
