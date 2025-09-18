import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPurchasesRepository } from '@/repositories/memory/purchasesRepo';
import { MemoryPriceBookRepository } from '@/repositories/memory/priceBookRepo';
import { 
  PriceEntry, Supplier, CreatePurchaseDTO 
} from '@/lib/types/purchase';

describe('MemoryPurchasesRepository', () => {
  let repo: MemoryPurchasesRepository;
  let mockSuppliers: Supplier[];

  beforeEach(() => {
    mockSuppliers = [
      {
        id: 'supplier-1',
        name: 'Test Supplier',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];
    repo = new MemoryPurchasesRepository([], [], mockSuppliers);
  });

  describe('create', () => {
    it('should create a purchase with items and compute derived fields', async () => {
      const dto: CreatePurchaseDTO = {
        invoiceNo: 'INV-001',
        supplierId: 'supplier-1',
        date: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: 100,
        tax: 10,
        shipping: 5,
        items: [
          {
            productId: 'product-1',
            unitType: 'sheet',
            units: 10,
            width: 2,
            height: 3,
            uom: 'ft',
            unitCost: 5,
            generatePrice: true
          }
        ]
      };

      const result = await repo.create(dto);

      expect(result.id).toBeDefined();
      expect(result.invoiceNo).toBe('INV-001');
      expect(result.items).toHaveLength(1);
      
      const item = result.items[0];
      expect(item.areaFt2PerUnit).toBe(6); // 2 * 3
      expect(item.areaFt2Total).toBe(60); // 6 * 10
      expect(item.totalCost).toBe(50); // 10 * 5
      expect(item.costFt2Line).toBe(50/60); // 50 / 60
    });

    it('should handle sqft unit type correctly', async () => {
      const dto: CreatePurchaseDTO = {
        invoiceNo: 'INV-002',
        supplierId: 'supplier-1',
        date: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: [
          {
            unitType: 'sqft',
            units: 100,
            uom: 'ft',
            unitCost: 2,
            generatePrice: true
          }
        ]
      };

      const result = await repo.create(dto);
      const item = result.items[0];
      
      expect(item.areaFt2PerUnit).toBe(1);
      expect(item.areaFt2Total).toBe(100);
      expect(item.costFt2Line).toBe(2);
    });
  });

  describe('list with pagination', () => {
    beforeEach(async () => {
      // Create test data
      for (let i = 1; i <= 15; i++) {
        await repo.create({
          invoiceNo: `INV-${i.toString().padStart(3, '0')}`,
          supplierId: 'supplier-1',
          date: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          currency: 'USD',
          subtotal: i * 10,
          tax: 0,
          shipping: 0,
          items: [{
            unitType: 'sqft',
            units: 10,
            uom: 'ft',
            unitCost: 1,
            generatePrice: false
          }]
        });
      }
    });

    it('should paginate results correctly', async () => {
      const page1 = await repo.list(undefined, { page: 1, limit: 5 });
      expect(page1.purchases).toHaveLength(5);
      expect(page1.total).toBe(15);

      const page2 = await repo.list(undefined, { page: 2, limit: 5 });
      expect(page2.purchases).toHaveLength(5);
      expect(page2.total).toBe(15);

      const page4 = await repo.list(undefined, { page: 4, limit: 5 });
      expect(page4.purchases).toHaveLength(0);
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      await repo.create({
        invoiceNo: 'INV-EARLY',
        supplierId: 'supplier-1',
        date: new Date('2024-01-01'),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: []
      });

      await repo.create({
        invoiceNo: 'INV-LATE',
        supplierId: 'supplier-1',
        date: new Date('2024-01-31'),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: []
      });
    });

    it('should filter by date range', async () => {
      const result = await repo.findByDateRange(
        new Date('2024-01-15'),
        new Date('2024-02-01')
      );

      expect(result.purchases).toHaveLength(1);
      expect(result.purchases[0].invoiceNo).toBe('INV-LATE');
    });

    it('should filter by invoice number partial match', async () => {
      const result = await repo.list({ invoiceNo: 'EARLY' });
      
      expect(result.purchases).toHaveLength(1);
      expect(result.purchases[0].invoiceNo).toBe('INV-EARLY');
    });
  });

  describe('soft delete', () => {
    it('should soft delete purchase and items', async () => {
      const purchase = await repo.create({
        invoiceNo: 'INV-DELETE',
        supplierId: 'supplier-1',
        date: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: [{
          unitType: 'sqft',
          units: 10,
          uom: 'ft',
          unitCost: 1,
          generatePrice: false
        }]
      });

      await repo.softDelete(purchase.id);

      const retrieved = await repo.getById(purchase.id);
      expect(retrieved).toBeNull();

      const allPurchases = await repo.list();
      expect(allPurchases.purchases).toHaveLength(0);
    });
  });
});

describe('MemoryPriceBookRepository', () => {
  let repo: MemoryPriceBookRepository;

  beforeEach(() => {
    repo = new MemoryPriceBookRepository();
  });

  describe('pin/unpin functionality', () => {
    let entry1: PriceEntry;
    let entry2: PriceEntry;

    beforeEach(async () => {
      entry1 = await repo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.5,
        currency: 'USD',
        pinned: false,
        active: true
      });

      entry2 = await repo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 2.0,
        currency: 'USD',
        pinned: false,
        active: true
      });
    });

    it('should pin an entry and unpin others', async () => {
      await repo.pinEntry('product-1', entry1.id);

      const updated1 = await repo.getById(entry1.id);
      const updated2 = await repo.getById(entry2.id);

      expect(updated1?.pinned).toBe(true);
      expect(updated2?.pinned).toBe(false);
    });

    it('should resolve current as pinned entry even if not latest', async () => {
      await repo.pinEntry('product-1', entry1.id);

      const current = await repo.resolveCurrent('product-1');
      expect(current?.id).toBe(entry1.id);
      expect(current?.costFt2).toBe(1.5);
    });

    it('should resolve current as latest when no pinned entry', async () => {
      const current = await repo.resolveCurrent('product-1');
      expect(current?.id).toBe(entry2.id); // Latest by date
      expect(current?.costFt2).toBe(2.0);
    });

    it('should unpin entry', async () => {
      await repo.pinEntry('product-1', entry1.id);
      await repo.unpinEntry('product-1', entry1.id);

      const updated = await repo.getById(entry1.id);
      expect(updated?.pinned).toBe(false);

      // Should now resolve to latest
      const current = await repo.resolveCurrent('product-1');
      expect(current?.id).toBe(entry2.id);
    });
  });

  describe('list by product', () => {
    beforeEach(async () => {
      await repo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.0,
        currency: 'USD',
        pinned: false,
        active: true
      });

      await repo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 1.5,
        currency: 'USD',
        pinned: false,
        active: true
      });

      await repo.createEntry({
        productId: 'product-2',
        effectiveDate: new Date('2024-01-10'),
        costFt2: 2.0,
        currency: 'USD',
        pinned: false,
        active: true
      });
    });

    it('should return entries for specific product sorted by date desc', async () => {
      const entries = await repo.listByProduct('product-1');
      
      expect(entries).toHaveLength(2);
      expect(entries[0].effectiveDate.getTime()).toBeGreaterThan(entries[1].effectiveDate.getTime());
      expect(entries[0].costFt2).toBe(1.5);
      expect(entries[1].costFt2).toBe(1.0);
    });

    it('should return empty array for non-existent product', async () => {
      const entries = await repo.listByProduct('non-existent');
      expect(entries).toHaveLength(0);
    });
  });

  describe('soft delete', () => {
    it('should soft delete entry and exclude from queries', async () => {
      const entry = await repo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.0,
        currency: 'USD',
        pinned: false,
        active: true
      });

      await repo.softDelete(entry.id);

      const retrieved = await repo.getById(entry.id);
      expect(retrieved).toBeNull();

      const productEntries = await repo.listByProduct('product-1');
      expect(productEntries).toHaveLength(0);

      const current = await repo.resolveCurrent('product-1');
      expect(current).toBeNull();
    });
  });
});