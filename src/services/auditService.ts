export interface AuditEntry { entity:string; id:string; field:string; before:unknown; after:unknown; date:string; user:string; }
export function diffFields(entity:string, id:string, before:Record<string,unknown>, after:Record<string,unknown>, fields:string[], user='system'):AuditEntry[]{
  const entries:AuditEntry[] = [];
  for(const f of fields){
    if(before[f] !== after[f]) entries.push({ entity, id, field:f, before: before[f], after: after[f], date: new Date().toISOString(), user });
  }
  return entries;
}
