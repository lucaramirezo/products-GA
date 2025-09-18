// Types for Purchase and PriceBook domain
// Maps to schema: purchases, purchase_items, price_entries, suppliers

export type UnitType = 'sheet' | 'roll' | 'sqft';
export type UOM = 'ft' | 'in' | 'm' | 'cm';

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  active: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  date: Date;
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  notes?: string;
  attachments?: string[];
  active: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId?: string; // References products.sku
  unitType: UnitType;
  units: number;
  width?: number;
  height?: number;
  uom: UOM;
  // Computed fields (set by DB triggers)
  areaFt2PerUnit?: number;
  areaFt2Total?: number;
  unitCost: number;
  totalCost?: number;
  costFt2Line?: number;
  generatePrice: boolean;
  active: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceEntry {
  id: string;
  productId: string; // References products.sku
  supplierId?: string;
  sourceItemId?: string; // References purchase_items.id
  effectiveDate: Date;
  costFt2: number;
  currency: string;
  pinned: boolean;
  active: boolean;
  notes?: string;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// DTOs for service layer
export interface CreatePurchaseDTO {
  invoiceNo: string;
  supplierId: string;
  date: Date;
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  notes?: string;
  attachments?: string[];
  items: CreatePurchaseItemDTO[];
}

export interface CreatePurchaseItemDTO {
  productId?: string;
  unitType: UnitType;
  units: number;
  width?: number;
  height?: number;
  uom: UOM;
  unitCost: number;
  generatePrice: boolean;
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
  supplier?: Supplier;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PurchaseFilters {
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  invoiceNo?: string;
}

// XLSX Import types
export interface XLSXColumnMapping {
  productSku: string;
  supplierName: string;
  date: string;
  unitType: string;
  units: string;
  width?: string;
  height?: string;
  uom: string;
  unitCost: string;
  currency: string;
  invoiceNo?: string;
}

export interface XLSXImportRow {
  rowNumber: number;
  productSku?: string;
  supplierName: string;
  date: Date;
  unitType: UnitType;
  units: number;
  width?: number;
  height?: number;
  uom: UOM;
  unitCost: number;
  currency: string;
  invoiceNo?: string;
  // Computed fields for dry-run preview
  areaFt2PerUnit?: number;
  areaFt2Total?: number;
  totalCost?: number;
  costFt2Line?: number;
}

export interface XLSXImportResult {
  mode: 'dry-run' | 'commit';
  totalRows: number;
  validRows: XLSXImportRow[];
  errors: XLSXImportError[];
  warnings: XLSXImportWarning[];
  summary?: {
    purchasesCreated?: number;
    itemsCreated?: number;
    priceEntriesCreated?: number;
  };
}

export interface XLSXImportError {
  rowNumber: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface XLSXImportWarning extends XLSXImportError {
  severity: 'warning';
}