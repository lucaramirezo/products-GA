import { describe, expect, it } from 'vitest';
import { ExportService } from '@/lib/export/service';
import { DEFAULT_EXPORT_CONFIG } from '@/lib/export/types';
import type { PricedProductRow } from '@/lib/pricing/row';
import type { TableState } from '@/lib/export/types';

type RowOptions = {
  sku: string;
  name: string;
  providerId?: string;
  category?: string;
  active?: boolean;
  costSqft?: number;
  areaSqft?: number;
  finalPrice?: number;
};

function createRow(options: RowOptions): PricedProductRow {
  const costSqft = options.costSqft ?? 10;
  const areaSqft = options.areaSqft ?? 1;
  const finalPrice = options.finalPrice ?? costSqft * areaSqft + 5;

  return {
    product: {
      sku: options.sku,
      name: options.name,
      category: options.category ?? 'General',
      providerId: options.providerId ?? 'prov-1',
      cost_sqft: costSqft,
      area_sqft: areaSqft,
      active_tier: 1,
      active: options.active ?? true
    },
    catRule: undefined,
    override: null,
    activePricing: {
      base_per_sqft: costSqft,
      base_total: costSqft * areaSqft,
      ink_add: 1,
      lam_add: 1,
      cut_add: 0,
      addons_total: 2,
      final: finalPrice
    },
    tiersPreview: [],
    finalPrice,
    finalSource: 'Tier 1',
    margin: finalPrice - costSqft * areaSqft,
    lowMargin: false
  };
}

function createTableState(partial?: Partial<TableState>): TableState {
  return {
    query: '',
    visibleColumns: {},
    sortConfig: { key: null, direction: 'asc' },
    selectedProducts: [],
    ...partial
  };
}

describe('ExportService data preparation', () => {
  const providerName = (id: string) => (id === 'prov-2' ? 'Proveedor Dos' : 'Proveedor Uno');

  it('exports only selected products when scope is selected', () => {
    const rows = [
      createRow({ sku: 'SKU-1', name: 'Alpha' }),
      createRow({ sku: 'SKU-2', name: 'Bravo' }),
      createRow({ sku: 'SKU-3', name: 'Charlie' })
    ];

    const service = new ExportService({
      products: rows,
      allProducts: rows.map(row => row.product),
      config: {
        ...DEFAULT_EXPORT_CONFIG,
        scope: 'selected',
        selectedProductIds: ['SKU-1', 'SKU-3'],
        columns: ['sku', 'final_price'],
        includeHeaders: true,
        format: 'excel',
        currency: 'USD'
      },
      tableState: createTableState({
        sortConfig: { key: 'sku', direction: 'asc' },
        selectedProducts: ['SKU-1', 'SKU-3']
      }),
      providerName
    });

    const data = (service as any).prepareData() as Array<Record<string, { display: string; raw?: number }>>;

    expect(data).toHaveLength(2);
    expect(data.map(row => row.sku.display)).toEqual(['SKU-1', 'SKU-3']);
    expect(data[0].final_price.raw).toBeCloseTo(rows[0].finalPrice, 5);
  });

  it('respects global sorting when exporting all products', () => {
    const rows = [
      createRow({ sku: 'SKU-B', name: 'Bravo' }),
      createRow({ sku: 'SKU-A', name: 'Alpha' }),
      createRow({ sku: 'SKU-C', name: 'Charlie' })
    ];

    const service = new ExportService({
      products: rows,
      allProducts: rows.map(row => row.product),
      config: {
        ...DEFAULT_EXPORT_CONFIG,
        scope: 'all',
        columns: ['sku', 'name'],
        includeHeaders: true,
        format: 'excel',
        currency: 'USD'
      },
      tableState: createTableState({
        sortConfig: { key: 'name', direction: 'asc' }
      }),
      providerName
    });

    const data = (service as any).prepareData() as Array<Record<string, { display: string }>>;
    const orderedNames = data.map(row => row.name.display);

    expect(orderedNames).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('filters inactive products when onlyActive flag is enabled', () => {
    const rows = [
      createRow({ sku: 'SKU-1', name: 'Activo', active: true }),
      createRow({ sku: 'SKU-2', name: 'Inactivo', active: false })
    ];

    const service = new ExportService({
      products: rows,
      allProducts: rows.map(row => row.product),
      config: {
        ...DEFAULT_EXPORT_CONFIG,
        scope: 'filtered',
        columns: ['sku'],
        includeHeaders: true,
        format: 'excel',
        currency: 'USD',
        onlyActive: true
      },
      tableState: createTableState(),
      providerName
    });

    const data = (service as any).prepareData() as Array<Record<string, { display: string }>>;

    expect(data).toHaveLength(1);
    expect(data[0].sku.display).toBe('SKU-1');
  });
});
