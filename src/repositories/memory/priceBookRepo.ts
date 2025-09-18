import { PriceBookRepository } from '../interfaces';
import { PriceEntry } from '@/lib/types/purchase';

export class MemoryPriceBookRepository implements PriceBookRepository {
  private entries: PriceEntry[] = [];

  constructor(initialEntries: PriceEntry[] = []) {
    this.entries = initialEntries;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveEntries(): PriceEntry[] {
    return this.entries.filter(e => e.active && !e.deletedAt);
  }

  async listByProduct(productId: string): Promise<PriceEntry[]> {
    return this.getActiveEntries()
      .filter(e => e.productId === productId)
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  async getById(id: string): Promise<PriceEntry | null> {
    const entry = this.entries.find(e => e.id === id && e.active && !e.deletedAt);
    return entry || null;
  }

  async createEntry(entryData: Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceEntry> {
    const now = new Date().toISOString();
    const entry: PriceEntry = {
      ...entryData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    this.entries.push(entry);
    return entry;
  }

  async updateEntry(id: string, patch: Partial<PriceEntry>): Promise<PriceEntry> {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Entrada de precio no encontrada');

    const updated = {
      ...this.entries[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.entries[index] = updated;
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return;

    entry.deletedAt = new Date().toISOString();
    entry.active = false;
  }

  async pinEntry(productId: string, entryId: string): Promise<void> {
    // First unpin all entries for this product
    await this.unpinAllForProduct(productId);

    // Then pin the specified entry
    const entry = this.entries.find(e => e.id === entryId && e.productId === productId);
    if (!entry) throw new Error('Entrada de precio no encontrada');

    entry.pinned = true;
    entry.updatedAt = new Date().toISOString();
  }

  async unpinEntry(productId: string, entryId: string): Promise<void> {
    const entry = this.entries.find(e => e.id === entryId && e.productId === productId);
    if (!entry) throw new Error('Entrada de precio no encontrada');

    entry.pinned = false;
    entry.updatedAt = new Date().toISOString();
  }

  async unpinAllForProduct(productId: string): Promise<void> {
    const productEntries = this.entries.filter(e => e.productId === productId);
    const now = new Date().toISOString();

    productEntries.forEach(entry => {
      if (entry.pinned) {
        entry.pinned = false;
        entry.updatedAt = now;
      }
    });
  }

  async activateEntry(id: string): Promise<void> {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) throw new Error('Entrada de precio no encontrada');

    entry.active = true;
    entry.deletedAt = undefined;
    entry.updatedAt = new Date().toISOString();
  }

  async deactivateEntry(id: string): Promise<void> {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) throw new Error('Entrada de precio no encontrada');

    entry.active = false;
    entry.updatedAt = new Date().toISOString();
  }

  async resolveCurrent(productId: string): Promise<PriceEntry | null> {
    const activeEntries = this.getActiveEntries().filter(e => e.productId === productId);
    
    // First, look for pinned entries
    const pinnedEntry = activeEntries.find(e => e.pinned);
    if (pinnedEntry) return pinnedEntry;

    // If no pinned entry, return the latest by effective date
    const sortedByDate = activeEntries.sort((a, b) => 
      b.effectiveDate.getTime() - a.effectiveDate.getTime()
    );

    return sortedByDate[0] || null;
  }

  async resolveCurrentCost(productId: string): Promise<number | null> {
    const currentEntry = await this.resolveCurrent(productId);
    return currentEntry ? currentEntry.costFt2 : null;
  }
}