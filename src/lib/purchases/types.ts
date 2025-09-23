export interface CreatePurchaseInput {
  supplierId?: string;
  invoiceNo?: string;
  date: Date;
  currency?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export interface UpdatePurchaseInput {
  supplierId?: string;
  invoiceNo?: string;
  date?: Date;
  currency?: string;
  notes?: string;
  items?: CreatePurchaseItemInput[];
}

export interface CreatePurchaseItemInput {
  productId?: string;
  name: string;
  qty: number;
  unit: 'sqft' | 'sheet';
  areaSqft?: number; // Area in square feet - optional for backward compatibility
  unitPrice: number;
  amount: number;
  linked?: boolean;
  appliedToProduct?: boolean;
  tempWidth?: number;
  tempHeight?: number;
  tempUom?: 'in' | 'cm';
  // New fields for product creation
  linkingMode?: 'existing' | 'create' | 'none';
  newProductCategory?: string;
  newProductArea?: number;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  invoiceNo?: string;
  date: Date;
  currency?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId?: string;
  name: string;
  qty: number;
  unit: 'sqft' | 'sheet';
  areaSqft?: number; // Area in square feet
  unitPrice: number;
  amount: number;
  linked: boolean;
  appliedToProduct: boolean;
  tempWidth?: number;
  tempHeight?: number;
  tempUom?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseWithDetails extends Purchase {
  supplierName?: string;
  items: PurchaseItem[];
  totalAmount: number;
  itemsCount: number;
}