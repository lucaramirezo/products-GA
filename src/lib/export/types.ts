// Export Types and Configurations
// This file defines all types for the new export system

export type ExportFormat = 'csv' | 'excel' | 'pdf';
export type ExportScope = 'filtered' | 'selected' | 'all' | 'active-only';
export type Currency = 'USD' | 'EUR';

// Column definitions with groupings
export interface ColumnGroup {
  id: string;
  label: string;
  columns: ExportColumn[];
}

export interface ExportColumn {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'number' | 'currency' | 'boolean' | 'date';
  required?: boolean;
  group: 'basic' | 'pricing' | 'details' | 'metadata';
}

// Available export columns organized by groups
export const EXPORT_COLUMNS: Record<string, ExportColumn> = {
  // Basic columns
  sku: { id: 'sku', label: 'SKU', type: 'text', required: true, group: 'basic' },
  name: { id: 'name', label: 'Producto', type: 'text', required: true, group: 'basic' },
  category: { id: 'category', label: 'Categoría', type: 'text', group: 'basic' },
  provider: { id: 'provider', label: 'Proveedor', type: 'text', group: 'basic' },
  
  // Pricing columns
  cost_sqft: { id: 'cost_sqft', label: 'Costo/ft²', type: 'currency', group: 'pricing' },
  tier: { id: 'tier', label: 'Tier', type: 'number', group: 'pricing' },
  base_total: { id: 'base_total', label: 'Base Total', type: 'currency', group: 'pricing' },
  final_price: { id: 'final_price', label: 'PVP Final', type: 'currency', group: 'pricing' },
  margin: { id: 'margin', label: 'Margen', type: 'currency', group: 'pricing' },
  
  // Details columns
  ink_add: { id: 'ink_add', label: 'Tinta', type: 'currency', group: 'details' },
  lam_add: { id: 'lam_add', label: 'Laminado', type: 'currency', group: 'details' },
  cut_add: { id: 'cut_add', label: 'Corte', type: 'currency', group: 'details' },
  addons_total: { id: 'addons_total', label: 'Add-ons', type: 'currency', group: 'details' },
  
  // Metadata columns
  area_sqft: { id: 'area_sqft', label: 'Área ft²', type: 'number', group: 'metadata' },
  created_at: { id: 'created_at', label: 'Creado', type: 'date', group: 'metadata' },
  updated_at: { id: 'updated_at', label: 'Actualizado', type: 'date', group: 'metadata' }
};

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: 'basic',
    label: 'Información Básica',
    columns: Object.values(EXPORT_COLUMNS).filter(col => col.group === 'basic')
  },
  {
    id: 'pricing',
    label: 'Precios y Costos',
    columns: Object.values(EXPORT_COLUMNS).filter(col => col.group === 'pricing')
  },
  {
    id: 'details',
    label: 'Detalles de Cálculo',
    columns: Object.values(EXPORT_COLUMNS).filter(col => col.group === 'details')
  },
  {
    id: 'metadata',
    label: 'Metadatos',
    columns: Object.values(EXPORT_COLUMNS).filter(col => col.group === 'metadata')
  }
];

// Export configuration interface
export interface ExportConfig {
  // Scope and filters
  scope: ExportScope;
  selectedProductIds?: string[];
  onlyActive: boolean;
  
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  
  // Category and supplier filters
  categories?: string[];
  suppliers?: string[];
  
  // Column selection
  columns: string[]; // Column IDs
  includeHeaders: boolean;
  
  // Format and currency
  format: ExportFormat;
  currency: Currency;
  
  // File options
  filename?: string;
}

// Export preset interface
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  config: Omit<ExportConfig, 'selectedProductIds' | 'filename'>;
}

// Built-in export presets
export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'basic-price-list',
    name: 'Lista de Precios Básica',
    description: 'SKU, producto, categoría, proveedor y precio final',
    icon: '📋',
    config: {
      scope: 'active-only',
      onlyActive: true,
      columns: ['sku', 'name', 'category', 'provider', 'final_price'],
      includeHeaders: true,
      format: 'excel',
      currency: 'USD'
    }
  },
  {
    id: 'full-catalog',
    name: 'Catálogo Completo',
    description: 'Todos los datos de productos con cálculos detallados',
    icon: '📚',
    config: {
      scope: 'all',
      onlyActive: false,
      columns: Object.keys(EXPORT_COLUMNS),
      includeHeaders: true,
      format: 'excel',
      currency: 'USD'
    }
  },
  {
    id: 'cost-analysis',
    name: 'Análisis de Costos',
    description: 'Enfoque en costos, márgenes y rentabilidad',
    icon: '💰',
    config: {
      scope: 'active-only',
      onlyActive: true,
      columns: ['sku', 'name', 'category', 'cost_sqft', 'final_price', 'margin', 'tier'],
      includeHeaders: true,
      format: 'excel',
      currency: 'USD'
    }
  },
  {
    id: 'client-price-list',
    name: 'Lista para Cliente',
    description: 'Lista limpia sin costos internos',
    icon: '🏷️',
    config: {
      scope: 'active-only',
      onlyActive: true,
      columns: ['sku', 'name', 'category', 'final_price', 'area_sqft'],
      includeHeaders: true,
      format: 'excel',
      currency: 'USD'
    }
  }
];

// Export state interface for the modal
export interface ExportState {
  isOpen: boolean;
  config: ExportConfig;
  preview: {
    totalRows: number;
    selectedColumns: string[];
    estimatedFileSize: string;
  } | null;
  isExporting: boolean;
  error: string | null;
}

// Default export configuration
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  scope: 'filtered',
  onlyActive: true,
  columns: ['sku', 'name', 'category', 'provider', 'final_price'],
  includeHeaders: true,
  format: 'excel',
  currency: 'USD'
};

// Table sorting interface (used to preserve sorting in exports)
export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

// Current table state interface (to be passed to export functions)
export interface TableState {
  query: string;
  visibleColumns: Record<string, boolean>;
  sortConfig: SortConfig;
  selectedProducts: string[];
}