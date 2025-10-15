import { PricedProductRow } from '@/lib/pricing/row';
import { Product } from '@/lib/pricing/types';
import { ExportConfig, ExportColumn, EXPORT_COLUMNS, Currency, TableState, SortConfig } from './types';

// Excel and PDF export libraries (to be installed later)
// npm install xlsx jspdf jspdf-autotable

export interface ExportServiceOptions {
  products: PricedProductRow[];
  allProducts: Product[];
  config: ExportConfig;
  tableState: TableState;
  providerName: (id: string) => string;
}

type ExcelCell = import('exceljs').Cell;

export class ExportService {
  private products: PricedProductRow[];
  private allProducts: Product[];
  private config: ExportConfig;
  private tableState: TableState;
  private providerName: (id: string) => string;

  constructor(options: ExportServiceOptions) {
    this.products = options.products;
    this.allProducts = options.allProducts;
    this.config = options.config;
    this.tableState = options.tableState;
    this.providerName = options.providerName;
  }

  // Main export method
  async export(): Promise<void> {
    const data = this.prepareData();
    const filename = this.generateFilename();

    switch (this.config.format) {
      case 'csv':
        this.exportToCsv(data, filename);
        break;
      case 'excel':
        await this.exportToExcel(data, filename);
        break;
      case 'pdf':
        await this.exportToPdf(data, filename);
        break;
      default:
        throw new Error(`Formato no soportado: ${this.config.format}`);
    }
  }

  // Prepare and filter data based on configuration
  private prepareData(): ExportRow[] {
    let sourceProducts = this.getSourceProducts();
    
    // Apply filters
    sourceProducts = this.applyFilters(sourceProducts);
    
    // Apply sorting from table state
    sourceProducts = this.applySorting(sourceProducts);
    
    // Convert to export format
    return sourceProducts.map(product => this.productToExportRow(product));
  }

  private getSourceProducts(): PricedProductRow[] {
    switch (this.config.scope) {
      case 'all':
        return this.allProducts.map(p => 
          this.products.find(r => r.product.sku === p.sku) || 
          this.createEmptyRow(p)
        );
      case 'filtered':
        return this.products; // Already filtered by table state
      case 'selected':
        return this.products.filter(p => 
          this.config.selectedProductIds?.includes(p.product.sku)
        );
      case 'active-only':
        return this.products.filter(p => p.product.active);
      default:
        return this.products;
    }
  }

  private applyFilters(products: PricedProductRow[]): PricedProductRow[] {
    let filtered = products;

    // Active filter
    if (this.config.onlyActive) {
      filtered = filtered.filter(p => p.product.active);
    }

    // Price filters
    if (this.config.minPrice !== undefined) {
      filtered = filtered.filter(p => p.finalPrice >= this.config.minPrice!);
    }
    if (this.config.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.finalPrice <= this.config.maxPrice!);
    }

    // Category filter
    if (this.config.categories && this.config.categories.length > 0) {
      filtered = filtered.filter(p => this.config.categories!.includes(p.product.category));
    }

    // Supplier filter
    if (this.config.suppliers && this.config.suppliers.length > 0) {
      filtered = filtered.filter(p => this.config.suppliers!.includes(p.product.providerId));
    }

    return filtered;
  }

  private applySorting(products: PricedProductRow[]): PricedProductRow[] {
    const { sortConfig } = this.tableState;
    if (!sortConfig.key) return products;

    return [...products].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortConfig.key) {
        case 'sku':
          aValue = a.product.sku;
          bValue = b.product.sku;
          break;
        case 'name':
          aValue = a.product.name;
          bValue = b.product.name;
          break;
        case 'cost_sqft':
          aValue = a.product.cost_sqft;
          bValue = b.product.cost_sqft;
          break;
        case 'final_price':
          aValue = a.finalPrice;
          bValue = b.finalPrice;
          break;
        case 'category':
          aValue = a.product.category;
          bValue = b.product.category;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private productToExportRow(product: PricedProductRow): ExportRow {
    const row: ExportRow = {};

    this.config.columns.forEach(columnId => {
      const column = EXPORT_COLUMNS[columnId];
      if (!column) return;

      row[columnId] = this.getColumnValue(product, column);
    });

    return row;
  }

  private getColumnValue(product: PricedProductRow, column: ExportColumn): ExportCellValue {
    switch (column.id) {
      case 'sku':
        return { display: product.product.sku };
      case 'name':
        return { display: product.product.name };
      case 'category':
        return { display: product.product.category };
      case 'provider':
        return { display: this.providerName(product.product.providerId) };
      case 'cost_sqft':
        return {
          display: this.formatCurrency(product.product.cost_sqft),
          raw: product.product.cost_sqft
        };
      case 'tier':
        return {
          display: product.product.active_tier?.toString() ?? '',
          raw: product.product.active_tier ?? null
        };
      case 'base_total':
        return {
          display: this.formatCurrency(product.activePricing.base_total),
          raw: product.activePricing.base_total
        };
      case 'final_price':
        return {
          display: this.formatCurrency(product.finalPrice),
          raw: product.finalPrice
        };
      case 'margin':
        return {
          display: this.formatCurrency(product.margin),
          raw: product.margin
        };
      case 'ink_add':
        return {
          display: this.formatCurrency(product.activePricing.ink_add),
          raw: product.activePricing.ink_add
        };
      case 'lam_add':
        return {
          display: this.formatCurrency(product.activePricing.lam_add),
          raw: product.activePricing.lam_add
        };
      case 'cut_add':
        return {
          display: this.formatCurrency(product.activePricing.cut_add),
          raw: product.activePricing.cut_add
        };
      case 'addons_total':
        return {
          display: this.formatCurrency(product.activePricing.addons_total),
          raw: product.activePricing.addons_total
        };
      case 'area_sqft':
        return {
          display: product.product.area_sqft?.toString() ?? '',
          raw: product.product.area_sqft ?? null
        };
      case 'created_at': {
        const date = product.product.created_at ? new Date(product.product.created_at) : null;
        return {
          display: date ? date.toLocaleDateString('es-ES') : '',
          raw: date
        };
      }
      case 'updated_at': {
        const date = product.product.updated_at ? new Date(product.product.updated_at) : null;
        return {
          display: date ? date.toLocaleDateString('es-ES') : '',
          raw: date
        };
      }
      default:
        return { display: '' };
    }
  }

  private formatCurrency(value: number): string {
    if (this.config.currency === 'USD') {
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }

  private createEmptyRow(product: Product): PricedProductRow {
    // Create a basic row for products not in current pricing calculation
    return {
      product,
      catRule: undefined,
      override: null,
      activePricing: {
        base_per_sqft: 0,
        base_total: 0,
        ink_add: 0,
        lam_add: 0,
        cut_add: 0,
        addons_total: 0,
        final: 0
      },
      tiersPreview: [],
      finalPrice: 0,
      finalSource: 'N/A',
      margin: 0,
      lowMargin: false
    };
  }

  private generateFilename(): string {
    if (this.config.filename) {
      return this.config.filename;
    }

    const date = new Date().toISOString().slice(0, 10);
    const scope = this.config.scope === 'all' ? 'completo' : 
                  this.config.scope === 'filtered' ? 'filtrado' : 
                  this.config.scope === 'selected' ? 'seleccionado' : 'activo';
    
    return `productos_${scope}_${date}`;
  }

  // CSV Export
  private exportToCsv(data: ExportRow[], filename: string): void {
    const headers = this.config.includeHeaders ? 
      this.config.columns.map(colId => EXPORT_COLUMNS[colId]?.label || colId) : [];
    
    const rows = data.map(row => 
      this.config.columns.map(colId => {
        const cell = row[colId];
        return cell ? cell.display : '';
      })
    );

    const csvContent = [
      ...(this.config.includeHeaders ? [headers] : []),
      ...rows
    ].map(row => 
      row.map(cell => {
        const s = String(cell);
        return s.includes(';') || s.includes(',') || s.includes('\n') || s.includes('"') 
          ? `"${s.replace(/"/g, '""')}"` 
          : s;
      }).join(';')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${filename}.csv`);
  }

  // Excel Export with styling
  private async exportToExcel(data: ExportRow[], filename: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    const columnDefinitions = this.config.columns.map(columnId => {
      const column = EXPORT_COLUMNS[columnId];
      const header = column?.label ?? columnId;
      return {
        header,
        key: columnId,
        width: Math.max(header.length + 6, 14)
      };
    });

    worksheet.columns = columnDefinitions as any;
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    data.forEach(row => {
      const excelRow: Record<string, string | number | Date | boolean | null> = {};

      this.config.columns.forEach(columnId => {
        const cell = row[columnId];
        if (!cell) {
          excelRow[columnId] = '';
          return;
        }

        excelRow[columnId] = (cell.raw ?? cell.display) as string | number | Date | boolean | null;
      });

      worksheet.addRow(excelRow);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    this.config.columns.forEach((columnId, index) => {
      const column = worksheet.getColumn(index + 1);
      const metadata = EXPORT_COLUMNS[columnId];
      if (!metadata) {
        return;
      }

      if (metadata.type === 'currency') {
        column.numFmt = this.config.currency === 'USD' ? '"$"#,##0.00' : '"€"#,##0.00';
        column.alignment = { horizontal: 'right' };
      } else if (metadata.type === 'number') {
        column.alignment = { horizontal: 'right' };
      } else if (metadata.type === 'date') {
        column.numFmt = 'dd/mm/yyyy';
      }

      let maxLength = column.header ? column.header.toString().length : 10;
  column.eachCell({ includeEmpty: true }, (cell: ExcelCell) => {
        const value = cell.value;
        if (value === undefined || value === null) {
          return;
        }

        let text: string;
        if (value instanceof Date) {
          text = value.toLocaleDateString('es-ES');
        } else if (typeof value === 'object' && 'richText' in (value as any)) {
          text = (value as any).richText.map((part: { text: string }) => part.text).join('');
        } else {
          text = value.toString();
        }

        if (text.length > maxLength) {
          maxLength = text.length;
        }
      });

      column.width = Math.min(Math.max(maxLength + 2, 14), 50);
    });

    const columnCount = this.config.columns.length;
    if (columnCount > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columnCount }
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    this.downloadFile(blob, `${filename}.xlsx`);
  }

  // PDF Export (fallback to CSV for now)
  private async exportToPdf(data: ExportRow[], filename: string): Promise<void> {
    console.warn('PDF export not yet implemented, falling back to CSV');
    // For now, export as CSV
    this.exportToCsv(data, filename + '_pdf-format');
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Helper types for export rows
interface ExportCellValue {
  display: string;
  raw?: number | Date | boolean | null;
}

interface ExportRow {
  [columnId: string]: ExportCellValue | undefined;
}

// Convenience function for quick exports
export async function quickExport(options: ExportServiceOptions): Promise<void> {
  const service = new ExportService(options);
  await service.export();
}