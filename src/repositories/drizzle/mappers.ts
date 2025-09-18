import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import { 
  Purchase, PurchaseItem, PriceEntry, Supplier, UnitType, UOM 
} from '@/lib/types/purchase';
import { 
  products, tiers, categoryRules, priceParams, providers, auditLog,
  purchases, purchaseItems, priceEntries, suppliers
} from '@/db/schema';

// Map DB rows (camel case fields in schema objects) to domain types expected by existing code.
// Drizzle returns field names as defined in schema (camelCase) but DB columns are snake_case.

interface ProductRow { sku:string; name:string; category:string; providerId:string; costSqft:string|number; areaSqft:string|number; activeTier:number; overrideMultiplier:string|number|null; overrideNumberOfLayers:number|null; inkEnabled:boolean; lamEnabled:boolean; cutEnabled:boolean; sellMode:'SQFT'|'SHEET'; sheetsCount:number|null; active:boolean; deletedAt: string|null; createdAt:string; updatedAt:string }
export function mapProduct(row: ProductRow): Product {
  return {
    sku: row.sku,
    name: row.name,
    category: row.category,
    providerId: row.providerId,
    cost_sqft: numberOr(row.costSqft),
    area_sqft: numberOr(row.areaSqft),
    active_tier: row.activeTier,
    override_multiplier: numberOr(row.overrideMultiplier, undefined),
    override_number_of_layers: row.overrideNumberOfLayers ?? undefined,
    ink_enabled: row.inkEnabled ?? true,
    lam_enabled: row.lamEnabled ?? false,
    cut_enabled: row.cutEnabled ?? false,
    sell_mode: row.sellMode || 'SQFT',
    sheets_count: row.sheetsCount ?? undefined,
    active: row.active,
    deleted_at: row.deletedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  } as Product;
}

interface TierRow { id:number; mult:string|number; numberOfLayers:number }
export function mapTier(row:TierRow): Tier {
  return { id: row.id, mult: numberOr(row.mult)!, number_of_layers: row.numberOfLayers };
}

interface CategoryRuleRow { category:string; overrideMultiplier:string|number|null; overrideNumberOfLayers:number|null }
export function mapCategoryRule(row:CategoryRuleRow): CategoryRule {
  return {
    category: row.category,
    override_multiplier: numberOr(row.overrideMultiplier, undefined),
    override_number_of_layers: row.overrideNumberOfLayers ?? undefined
  };
}

interface ParamsRow { inkPrice:string|number; laminationPrice:string|number; cutPrice:string|number; cutFactor:string|number; roundingStep:string|number; costMethod:string; defaultTier:number; createdAt?:string; updatedAt?:string }
export function mapParams(row:ParamsRow): PriceParams {
  return {
    ink_price: numberOr(row.inkPrice)!,
    lamination_price: numberOr(row.laminationPrice)!,
    cut_price: numberOr(row.cutPrice)!,
    cut_factor: numberOr(row.cutFactor)!,
    rounding_step: numberOr(row.roundingStep)!,
    cost_method: row.costMethod,
    default_tier: row.defaultTier,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  };
}

function numberOr(v:unknown, fallback?:number): number | undefined { if(v==null) return fallback; if(typeof v === 'number') return v; const n = Number(v); return isNaN(n)? fallback : n; }

// Purchase domain mappers
interface SupplierRow { 
  id: string; name: string; contactInfo: string | null; paymentTerms: string | null; 
  active: boolean; deletedAt: Date | null; createdAt: Date | null; updatedAt: Date | null; 
}
export function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactInfo ?? undefined, // Map contactInfo to contactEmail for now
    contactPhone: undefined,
    address: undefined,
    notes: row.paymentTerms ?? undefined, // Map paymentTerms to notes for now
    active: row.active,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString()
  };
}

interface PurchaseRow { 
  id: string; invoiceNo: string; supplierId: string | null; date: Date; 
  currency: string; subtotal: string | number; tax: string | number; shipping: string | number; 
  notes: string | null; attachments: string[] | null; active: boolean; 
  deletedAt: Date | null; createdAt: Date | null; updatedAt: Date | null; 
}
export function mapPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    invoiceNo: row.invoiceNo,
    supplierId: row.supplierId!,
    date: row.date,
    currency: row.currency,
    subtotal: numberOr(row.subtotal)!,
    tax: numberOr(row.tax)!,
    shipping: numberOr(row.shipping)!,
    notes: row.notes ?? undefined,
    attachments: row.attachments ?? undefined,
    active: row.active,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString()
  };
}

interface PurchaseItemRow { 
  id: string; purchaseId: string; productId: string | null; unitType: UnitType; 
  units: string | number; width: string | number | null; height: string | number | null; 
  uom: UOM; areaFt2PerUnit: string | number | null; areaFt2Total: string | number | null; 
  unitCost: string | number; totalCost: string | number | null; costFt2Line: string | number | null; 
  generatePrice: boolean; active: boolean; deletedAt: Date | null; 
  createdAt: Date | null; updatedAt: Date | null; 
}
export function mapPurchaseItem(row: PurchaseItemRow): PurchaseItem {
  return {
    id: row.id,
    purchaseId: row.purchaseId,
    productId: row.productId ?? undefined,
    unitType: row.unitType,
    units: numberOr(row.units)!,
    width: numberOr(row.width, undefined),
    height: numberOr(row.height, undefined),
    uom: row.uom,
    areaFt2PerUnit: numberOr(row.areaFt2PerUnit, undefined),
    areaFt2Total: numberOr(row.areaFt2Total, undefined),
    unitCost: numberOr(row.unitCost)!,
    totalCost: numberOr(row.totalCost, undefined),
    costFt2Line: numberOr(row.costFt2Line, undefined),
    generatePrice: row.generatePrice,
    active: row.active,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString()
  };
}

interface PriceEntryRow { 
  id: string; productId: string; supplierId: string | null; sourceItemId: string | null; 
  effectiveDate: Date; costFt2: string | number; currency: string; pinned: boolean; 
  active: boolean; notes: string | null; deletedAt: Date | null; 
  createdAt: Date | null; updatedAt: Date | null; 
}
export function mapPriceEntry(row: PriceEntryRow): PriceEntry {
  return {
    id: row.id,
    productId: row.productId,
    supplierId: row.supplierId ?? undefined,
    sourceItemId: row.sourceItemId ?? undefined,
    effectiveDate: row.effectiveDate,
    costFt2: numberOr(row.costFt2)!,
    currency: row.currency,
    pinned: row.pinned,
    active: row.active,
    notes: row.notes ?? undefined,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString()
  };
}

export const schemaRefs = { 
  products, tiers, categoryRules, priceParams, providers, auditLog,
  purchases, purchaseItems, priceEntries, suppliers
};
