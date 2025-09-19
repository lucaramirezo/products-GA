export interface CreatePurchaseInput {
  supplierId?: string;
  invoiceNo?: string;
  date: Date;
  currency?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export interface CreatePurchaseItemInput {
  productId?: string;
  name: string;
  qty: number;
  unit: 'sqft' | 'sheet';
  amount: number;
  linked?: boolean;
  appliedToProduct?: boolean;
  tempWidth?: number;
  tempHeight?: number;
  tempUom?: 'in' | 'cm';
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
  amount: number;
  linked: boolean;
  appliedToProduct: boolean;
  tempWidth?: number;
  tempHeight?: number;
  tempUom?: string;
  createdAt: Date;
  updatedAt: Date;
}