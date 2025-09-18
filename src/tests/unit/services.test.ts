import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseService } from '@/services/purchaseService';
import { PriceBookService } from '@/services/priceBookService';
import { MemoryPurchasesRepository } from '@/repositories/memory/purchasesRepo';
import { MemoryPriceBookRepository } from '@/repositories/memory/priceBookRepo';
import { InMemoryProductsRepo } from '@/repositories/memory/productsRepo';
import { CreatePurchaseDTO } from '@/lib/types/purchase';
import { Product } from '@/lib/pricing/types';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let purchasesRepo: MemoryPurchasesRepository;
  let priceBookRepo: MemoryPriceBookRepository;

  beforeEach(() => {
    purchasesRepo = new MemoryPurchasesRepository();
    priceBookRepo = new MemoryPriceBookRepository();
    service = new PurchaseService(purchasesRepo, priceBookRepo);
  });

  describe('savePurchase', () => {
    it('should save purchase and generate price entries for items with generatePrice=true', async () => {
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
          },
          {
            productId: 'product-2',
            unitType: 'sqft',
            units: 50,
            uom: 'ft',
            unitCost: 2,
            generatePrice: false // Should not generate price entry
          }
        ]
      };

      const result = await service.savePurchase(dto);

      expect(result.id).toBeDefined();
      expect(result.items).toHaveLength(2);

      // Check that price entry was created for the first item
      const priceEntries = await priceBookRepo.listByProduct('product-1');
      expect(priceEntries).toHaveLength(1);
      expect(priceEntries[0].productId).toBe('product-1');
      expect(priceEntries[0].effectiveDate).toEqual(dto.date);
      expect(priceEntries[0].pinned).toBe(false);
      expect(priceEntries[0].notes).toContain('INV-001');

      // Check that no price entry was created for the second item
      const priceEntries2 = await priceBookRepo.listByProduct('product-2');
      expect(priceEntries2).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        invoiceNo: '',
        supplierId: 'supplier-1',
        date: new Date(),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: []
      };

      await expect(service.savePurchase(invalidDto)).rejects.toThrow('Número de factura es requerido');
    });

    it('should validate future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const dto: CreatePurchaseDTO = {
        invoiceNo: 'INV-001',
        supplierId: 'supplier-1',
        date: futureDate,
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
      };

      await expect(service.savePurchase(dto)).rejects.toThrow('La fecha de compra no puede ser futura');
    });

    it('should validate item requirements', async () => {
      const dto: CreatePurchaseDTO = {
        invoiceNo: 'INV-001',
        supplierId: 'supplier-1',
        date: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: 100,
        tax: 0,
        shipping: 0,
        items: [{
          unitType: 'sheet',
          units: 10,
          // Missing width and height for sheet type
          uom: 'ft',
          unitCost: 1,
          generatePrice: false
        }]
      };

      await expect(service.savePurchase(dto)).rejects.toThrow('Ancho es requerido');
    });

    it('should validate negative values', async () => {
      const dto: CreatePurchaseDTO = {
        invoiceNo: 'INV-001',
        supplierId: 'supplier-1',
        date: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: -100, // Invalid
        tax: 0,
        shipping: 0,
        items: []
      };

      await expect(service.savePurchase(dto)).rejects.toThrow('El subtotal no puede ser negativo');
    });
  });
});

describe('PriceBookService', () => {
  let service: PriceBookService;
  let priceBookRepo: MemoryPriceBookRepository;
  let productsRepo: InMemoryProductsRepo;

  beforeEach(() => {
    const mockProducts: Product[] = [
      {
        sku: 'product-1',
        name: 'Test Product',
        category: 'test',
        providerId: 'provider-1',
        cost_sqft: 1.5,
        area_sqft: 1,
        active_tier: 1,
        sell_mode: 'SQFT',
        active: true
      }
    ];

    priceBookRepo = new MemoryPriceBookRepository();
    productsRepo = new InMemoryProductsRepo(mockProducts);
    service = new PriceBookService(priceBookRepo, productsRepo);
  });

  describe('setPinned', () => {
    it('should pin a price entry and unpin others', async () => {
      // Create two price entries
      const entry1 = await priceBookRepo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.0,
        currency: 'USD',
        pinned: false,
        active: true
      });

      const entry2 = await priceBookRepo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 1.5,
        currency: 'USD',
        pinned: false,
        active: true
      });

      // Pin the first entry
      await service.setPinned('product-1', entry1.id);

      // Verify pinning
      const updated1 = await priceBookRepo.getById(entry1.id);
      const updated2 = await priceBookRepo.getById(entry2.id);

      expect(updated1?.pinned).toBe(true);
      expect(updated2?.pinned).toBe(false);

      // Verify current resolution
      const current = await service.resolveCurrent('product-1');
      expect(current?.id).toBe(entry1.id);
    });

    it('should throw error for non-existent product', async () => {
      await expect(service.setPinned('non-existent', 'entry-1')).rejects.toThrow('Producto no encontrado');
    });

    it('should throw error for inactive product', async () => {
      // Add inactive product
      await productsRepo.upsert({
        sku: 'inactive-product',
        name: 'Inactive Product',
        category: 'test',
        providerId: 'provider-1',
        cost_sqft: 1.5,
        area_sqft: 1,
        active_tier: 1,
        sell_mode: 'SQFT',
        active: false
      });

      await expect(service.setPinned('inactive-product', 'entry-1')).rejects.toThrow('Producto no encontrado o inactivo');
    });

    it('should throw error when entry does not belong to product', async () => {
      const entry = await priceBookRepo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.0,
        currency: 'USD',
        pinned: false,
        active: true
      });

      // Add another product
      await productsRepo.upsert({
        sku: 'product-2',
        name: 'Product 2',
        category: 'test',
        providerId: 'provider-1',
        cost_sqft: 1.5,
        area_sqft: 1,
        active_tier: 1,
        sell_mode: 'SQFT',
        active: true
      });

      await expect(service.setPinned('product-2', entry.id)).rejects.toThrow('La entrada de precio no pertenece al producto especificado');
    });
  });

  describe('createPriceEntry', () => {
    it('should create price entry with validation', async () => {
      const data = {
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 2.5,
        currency: 'USD',
        notes: 'Manual entry',
        pinned: true
      };

      const entry = await service.createPriceEntry(data);

      expect(entry.productId).toBe('product-1');
      expect(entry.costFt2).toBe(2.5);
      expect(entry.currency).toBe('USD');
      expect(entry.pinned).toBe(true);
      expect(entry.notes).toBe('Manual entry');
    });

    it('should validate negative cost', async () => {
      const data = {
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: -1, // Invalid
        currency: 'USD'
      };

      await expect(service.createPriceEntry(data)).rejects.toThrow('El costo por pie cuadrado no puede ser negativo');
    });

    it('should validate future effective date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const data = {
        productId: 'product-1',
        effectiveDate: futureDate,
        costFt2: 2.5,
        currency: 'USD'
      };

      await expect(service.createPriceEntry(data)).rejects.toThrow('La fecha efectiva no puede ser futura');
    });

    it('should validate empty currency', async () => {
      const data = {
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 2.5,
        currency: '' // Invalid
      };

      await expect(service.createPriceEntry(data)).rejects.toThrow('La moneda es requerida');
    });
  });

  describe('resolveCurrent', () => {
    it('should return current price entry following precedence rules', async () => {
      // Create entries with different dates
      const older = await priceBookRepo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-01'),
        costFt2: 1.0,
        currency: 'USD',
        pinned: false,
        active: true
      });

      const newer = await priceBookRepo.createEntry({
        productId: 'product-1',
        effectiveDate: new Date('2024-01-15'),
        costFt2: 1.5,
        currency: 'USD',
        pinned: false,
        active: true
      });

      // Without pinning, should return newer
      let current = await service.resolveCurrent('product-1');
      expect(current?.id).toBe(newer.id);
      expect(current?.costFt2).toBe(1.5);

      // Pin the older entry
      await service.setPinned('product-1', older.id);

      // Should now return pinned (older) entry
      current = await service.resolveCurrent('product-1');
      expect(current?.id).toBe(older.id);
      expect(current?.costFt2).toBe(1.0);
    });

    it('should return null for product with no price entries', async () => {
      const current = await service.resolveCurrent('product-1');
      expect(current).toBeNull();
    });
  });
});