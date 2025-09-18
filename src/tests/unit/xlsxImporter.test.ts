import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XLSXImporterService } from '@/services/xlsxImporter';
import { PurchaseService } from '@/services/purchaseService';
import { XLSXColumnMapping } from '@/lib/types/purchase';

// Mock the PurchaseService
const mockPurchaseService = {
  savePurchase: vi.fn()
} as unknown as PurchaseService;

describe('XLSXImporterService', () => {
  let service: XLSXImporterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XLSXImporterService(mockPurchaseService);
  });

  describe('importData dry-run mode', () => {
    it('should validate and process XLSX rows correctly', async () => {
      const mapping: XLSXColumnMapping = {
        productSku: 'Product SKU',
        supplierName: 'Supplier',
        date: 'Date',
        unitType: 'Unit Type',
        units: 'Quantity',
        width: 'Width',
        height: 'Height',
        uom: 'UOM',
        unitCost: 'Unit Cost',
        currency: 'Currency'
      };

      const testData = [
        {
          'Product SKU': 'PROD-001',
          'Supplier': 'Test Supplier Inc',
          'Date': '2024-01-15',
          'Unit Type': 'sheet',
          'Quantity': 10,
          'Width': 24,
          'Height': 36,
          'UOM': 'in',
          'Unit Cost': 5.50,
          'Currency': 'USD'
        },
        {
          'Product SKU': 'PROD-002',
          'Supplier': 'Test Supplier Inc',
          'Date': '2024-01-15',
          'Unit Type': 'sqft',
          'Quantity': 100,
          'UOM': 'ft',
          'Unit Cost': 2.25,
          'Currency': 'USD'
        }
      ];

      const result = await service.importData(testData, mapping, 'dry-run');

      expect(result.mode).toBe('dry-run');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Check first row calculations
      const row1 = result.validRows[0];
      expect(row1.productSku).toBe('PROD-001');
      expect(row1.supplierName).toBe('Test Supplier Inc');
      expect(row1.unitType).toBe('sheet');
      expect(row1.units).toBe(10);
      expect(row1.width).toBe(24);
      expect(row1.height).toBe(36);
      expect(row1.uom).toBe('in');
      expect(row1.unitCost).toBe(5.50);
      
      // Check area calculations (24 in * 36 in = 864 sq in = 6 sq ft)
      expect(row1.areaFt2PerUnit).toBe(6);
      expect(row1.areaFt2Total).toBe(60); // 6 * 10
      expect(row1.totalCost).toBe(55); // 10 * 5.50
      expect(row1.costFt2Line).toBe(55/60); // 55 / 60

      // Check second row calculations
      const row2 = result.validRows[1];
      expect(row2.unitType).toBe('sqft');
      expect(row2.areaFt2PerUnit).toBe(1);
      expect(row2.areaFt2Total).toBe(100);
      expect(row2.costFt2Line).toBe(2.25);
    });

    it('should handle validation errors', async () => {
      const mapping: XLSXColumnMapping = {
        productSku: 'Product SKU',
        supplierName: 'Supplier',
        date: 'Date',
        unitType: 'Unit Type',
        units: 'Quantity',
        uom: 'UOM',
        unitCost: 'Unit Cost',
        currency: 'Currency'
      };

      const invalidData = [
        {
          'Product SKU': 'PROD-001',
          'Supplier': '', // Missing supplier
          'Date': '2024-01-15',
          'Unit Type': 'sheet',
          'Quantity': -5, // Negative quantity
          'UOM': 'ft',
          'Unit Cost': 5.50,
          'Currency': 'USD'
          // Missing width/height for sheet type
        },
        {
          'Product SKU': 'PROD-002',
          'Supplier': 'Valid Supplier',
          'Date': '2024-12-31', // Changed to a past date instead of future
          'Unit Type': 'invalid_type', // Invalid unit type
          'Quantity': 10,
          'UOM': 'invalid_uom', // Invalid UOM
          'Unit Cost': -1, // Negative cost
          'Currency': 'USD'
        }
      ];

      const result = await service.importData(invalidData, mapping, 'dry-run');

      expect(result.totalRows).toBe(2);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check specific error types
      const errorMessages = result.errors.map(e => e.message);
      expect(errorMessages.some(msg => msg.includes('Nombre del proveedor es requerido'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('Cantidad debe ser mayor a 0'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('Tipo de unidad no válido'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('Ancho es requerido'))).toBe(true);
    });

    it('should handle different unit types correctly', async () => {
      const mapping: XLSXColumnMapping = {
        productSku: 'Product SKU',
        supplierName: 'Supplier',
        date: 'Date',
        unitType: 'Unit Type',
        units: 'Quantity',
        width: 'Width',
        height: 'Height',
        uom: 'UOM',
        unitCost: 'Unit Cost',
        currency: 'Currency'
      };

      const testData = [
        {
          'Product SKU': 'ROLL-001',
          'Supplier': 'Roll Supplier',
          'Date': '2024-01-15',
          'Unit Type': 'roll',
          'Quantity': 5,
          'Width': 60, // Rolls might have width but no height
          'UOM': 'in',
          'Unit Cost': 25.00,
          'Currency': 'USD'
        }
      ];

      const result = await service.importData(testData, mapping, 'dry-run');

      expect(result.validRows).toHaveLength(1);
      
      const row = result.validRows[0];
      expect(row.unitType).toBe('roll');
      expect(row.areaFt2PerUnit).toBeUndefined(); // Rolls don't have area calculation yet
      expect(row.totalCost).toBe(125); // 5 * 25.00
    });

    it('should handle different unit conversions', async () => {
      const mapping: XLSXColumnMapping = {
        productSku: 'Product SKU',
        supplierName: 'Supplier',
        date: 'Date',
        unitType: 'Unit Type',
        units: 'Quantity',
        width: 'Width',
        height: 'Height',
        uom: 'UOM',
        unitCost: 'Unit Cost',
        currency: 'Currency'
      };

      const testData = [
        {
          'Product SKU': 'METRIC-001',
          'Supplier': 'Metric Supplier',
          'Date': '2024-01-15',
          'Unit Type': 'sheet',
          'Quantity': 1,
          'Width': 1, // 1 meter
          'Height': 1, // 1 meter
          'UOM': 'm',
          'Unit Cost': 10.00,
          'Currency': 'USD'
        }
      ];

      const result = await service.importData(testData, mapping, 'dry-run');

      expect(result.validRows).toHaveLength(1);
      
      const row = result.validRows[0];
      // 1m x 1m = 1 sq meter ≈ 10.764 sq ft
      expect(row.areaFt2PerUnit).toBeCloseTo(10.764, 2);
      expect(row.costFt2Line).toBeCloseTo(10 / 10.764, 2);
    });
  });

  describe('date parsing', () => {
    it('should parse various date formats', async () => {
      const mapping: XLSXColumnMapping = {
        productSku: 'Product SKU',
        supplierName: 'Supplier',
        date: 'Date',
        unitType: 'Unit Type',
        units: 'Quantity',
        uom: 'UOM',
        unitCost: 'Unit Cost',
        currency: 'Currency'
      };

      const testData = [
        {
          'Product SKU': 'DATE-001',
          'Supplier': 'Date Supplier',
          'Date': '2024-01-15', // ISO string
          'Unit Type': 'sqft',
          'Quantity': 1,
          'UOM': 'ft',
          'Unit Cost': 1.00,
          'Currency': 'USD'
        },
        {
          'Product SKU': 'DATE-002',
          'Supplier': 'Date Supplier',
          'Date': 45306, // Excel serial number for 2024-01-15 (corrected)
          'Unit Type': 'sqft',
          'Quantity': 1,
          'UOM': 'ft',
          'Unit Cost': 1.00,
          'Currency': 'USD'
        }
      ];

      const result = await service.importData(testData, mapping, 'dry-run');

      expect(result.validRows).toHaveLength(2);
      
      // Both should parse to the same date
      expect(result.validRows[0].date.toDateString()).toBe(result.validRows[1].date.toDateString());
    });
  });
});