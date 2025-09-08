import { AuditRepo, AuditEntry } from '../interfaces';

export class InMemoryAuditRepo implements AuditRepo {
  private entries:AuditEntry[] = [];
  async insert(entries:AuditEntry[]){
    this.entries.unshift(...entries);
    // cap to 1000
    if(this.entries.length>1000) this.entries.length = 1000;
  }
  async latest(limit:number){ return this.entries.slice(0, limit); }
}
