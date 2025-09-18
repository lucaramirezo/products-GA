import { pgTable, text, uuid, smallint, numeric, integer, boolean, timestamp, bigserial, jsonb, check, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enum for sell mode
export const sellModeEnum = pgEnum('sell_mode', ['SQFT', 'SHEET']);

// Enum for purchase item unit types
export const unitTypeEnum = pgEnum('unit_type', ['sheet', 'roll', 'sqft']);

// Enum for unit of measure
export const uomEnum = pgEnum('uom', ['ft', 'in', 'cm', 'm']);

// providers (DEPRECATED - legacy for old "Proveedores" UI)
// Use 'suppliers' table for new Compras flow instead
// This table is kept for backward compatibility until migration is complete
export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  lastUpdate: timestamp('last_update', { withTimezone: true }).defaultNow() // DEPRECATED field
});

// suppliers (for new Compras flow - vendor catalog)
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  contactInfo: text('contact_info'),
  paymentTerms: text('payment_terms'),
  active: boolean('active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// tiers (fixed 1..5)
export const tiers = pgTable('tiers', {
  id: smallint('id').primaryKey(),
  mult: numeric('mult', { precision: 10, scale: 4 }).notNull(),
  numberOfLayers: integer('number_of_layers').notNull()
}, (t) => ({
  multPositive: check('tiers_mult_positive', sql`${t.mult} > 0`),
  numberOfLayersNonNegative: check('tiers_number_of_layers_non_negative', sql`${t.numberOfLayers} >= 0`),
  idRange: check('tiers_id_range', sql`${t.id} BETWEEN 1 AND 5`)
}));

// products
export const products = pgTable('products', {
  sku: text('sku').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  providerId: uuid('provider_id').notNull().references(() => providers.id, { onUpdate: 'cascade' }), // DEPRECATED - use price_entries for cost tracking
  costSqft: numeric('cost_sqft', { precision: 12, scale: 4 }).notNull(), // DEPRECATED - use current_cost_ft2 from products_with_cost view
  areaSqft: numeric('area_sqft', { precision: 10, scale: 3 }).notNull().default(sql`1`),
  activeTier: smallint('active_tier').notNull().references(() => tiers.id),
  overrideMultiplier: numeric('override_multiplier', { precision: 10, scale: 4 }),
  overrideNumberOfLayers: integer('override_number_of_layers'),
  inkEnabled: boolean('ink_enabled').notNull().default(true),
  lamEnabled: boolean('lam_enabled').notNull().default(false),
  cutEnabled: boolean('cut_enabled').notNull().default(false),
  sellMode: sellModeEnum('sell_mode').notNull().default('SQFT'),
  sheetsCount: integer('sheets_count'),
  currentPriceEntryId: uuid('current_price_entry_id'), // FK to price_entries (set after price_entries table is created)
  active: boolean('active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (t) => ({
  costSqftNonNegative: check('products_cost_sqft_non_negative', sql`${t.costSqft} >= 0`),
  areaSqftPositive: check('products_area_sqft_positive', sql`${t.areaSqft} > 0`),
  overrideMultPositive: check('products_override_multiplier_positive', sql`(${t.overrideMultiplier} IS NULL) OR (${t.overrideMultiplier} > 0)`),
  overrideNumberOfLayersNonNegative: check('products_override_number_of_layers_non_negative', sql`(${t.overrideNumberOfLayers} IS NULL) OR (${t.overrideNumberOfLayers} >= 0)`),
  sheetsCountNonNegative: check('products_sheets_count_non_negative', sql`(${t.sheetsCount} IS NULL) OR (${t.sheetsCount} >= 0)`),
  categoryIdx: index('products_category_idx').on(t.category),
  providerIdx: index('products_provider_idx').on(t.providerId),
  tierIdx: index('products_active_tier_idx').on(t.activeTier),
  sellModeIdx: index('products_sell_mode_idx').on(t.sellMode)
}));

// category_rules
export const categoryRules = pgTable('category_rules', {
  category: text('category').primaryKey(),
  overrideMultiplier: numeric('override_multiplier', { precision: 10, scale: 4 }),
  overrideNumberOfLayers: integer('override_number_of_layers')
});

// price_params singleton
export const priceParams = pgTable('price_params', {
  id: smallint('id').primaryKey().default(sql`1`),
  inkPrice: numeric('ink_price', { precision: 10, scale: 4 }).notNull(),
  laminationPrice: numeric('lamination_price', { precision: 10, scale: 4 }).notNull(),
  cutPrice: numeric('cut_price', { precision: 10, scale: 4 }).notNull(),
  cutFactor: numeric('cut_factor', { precision: 10, scale: 4 }).notNull().default(sql`0.25`),
  roundingStep: numeric('rounding_step', { precision: 10, scale: 4 }).notNull(),
  costMethod: text('cost_method').notNull().default(sql`'latest'`),
  defaultTier: smallint('default_tier').notNull().references(() => tiers.id)
}, (t) => ({
  inkPriceNonNegative: check('price_params_ink_price_non_negative', sql`${t.inkPrice} >= 0`),
  laminationPriceNonNegative: check('price_params_lamination_price_non_negative', sql`${t.laminationPrice} >= 0`),
  cutPriceNonNegative: check('price_params_cut_price_non_negative', sql`${t.cutPrice} >= 0`),
  cutFactorNonNegative: check('price_params_cut_factor_non_negative', sql`${t.cutFactor} >= 0`),
  roundingStepPositive: check('price_params_rounding_step_positive', sql`${t.roundingStep} > 0`),
  costMethodCheck: check('price_params_cost_method_valid', sql`${t.costMethod} = 'latest'`)
}));

// purchases (for new Compras flow)
export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNo: text('invoice_no').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onUpdate: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  currency: text('currency').notNull().default('USD'),
  subtotal: numeric('subtotal', { precision: 12, scale: 4 }).notNull(),
  tax: numeric('tax', { precision: 12, scale: 4 }).notNull().default('0'),
  shipping: numeric('shipping', { precision: 12, scale: 4 }).notNull().default('0'),
  notes: text('notes'),
  attachments: jsonb('attachments').$type<string[]>(),
  active: boolean('active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (t) => ({
  subtotalNonNegative: check('purchases_subtotal_non_negative', sql`${t.subtotal} >= 0`),
  taxNonNegative: check('purchases_tax_non_negative', sql`${t.tax} >= 0`),
  shippingNonNegative: check('purchases_shipping_non_negative', sql`${t.shipping} >= 0`),
  dateIdx: index('purchases_date_idx').on(t.date)
}));

// purchase_items (line items for purchases)
export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.sku),
  unitType: unitTypeEnum('unit_type').notNull(),
  units: numeric('units', { precision: 12, scale: 4 }).notNull(),
  width: numeric('width', { precision: 10, scale: 4 }),
  height: numeric('height', { precision: 10, scale: 4 }),
  uom: uomEnum('uom').notNull().default('ft'),
  // Computed fields (set by triggers)
  areaFt2PerUnit: numeric('area_ft2_per_unit', { precision: 12, scale: 6 }),
  areaFt2Total: numeric('area_ft2_total', { precision: 12, scale: 6 }),
  unitCost: numeric('unit_cost', { precision: 12, scale: 4 }).notNull(),
  totalCost: numeric('total_cost', { precision: 12, scale: 4 }),
  costFt2Line: numeric('cost_ft2_line', { precision: 12, scale: 6 }),
  generatePrice: boolean('generate_price').notNull().default(true),
  active: boolean('active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (t) => ({
  unitsPositive: check('purchase_items_units_positive', sql`${t.units} > 0`),
  widthPositive: check('purchase_items_width_positive', sql`(${t.width} IS NULL) OR (${t.width} > 0)`),
  heightPositive: check('purchase_items_height_positive', sql`(${t.height} IS NULL) OR (${t.height} > 0)`),
  unitCostNonNegative: check('purchase_items_unit_cost_non_negative', sql`${t.unitCost} >= 0`),
  purchaseIdx: index('purchase_items_purchase_idx').on(t.purchaseId)
}));

// price_entries (historical cost tracking)
export const priceEntries = pgTable('price_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: text('product_id').notNull().references(() => products.sku, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onUpdate: 'cascade' }),
  sourceItemId: uuid('source_item_id').references(() => purchaseItems.id, { onUpdate: 'cascade' }),
  effectiveDate: timestamp('effective_date', { mode: 'date' }).notNull(),
  costFt2: numeric('cost_ft2', { precision: 12, scale: 6 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  pinned: boolean('pinned').notNull().default(false),
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (t) => ({
  costFt2NonNegative: check('price_entries_cost_ft2_non_negative', sql`${t.costFt2} >= 0`),
  productDateIdx: index('price_entries_product_date_idx').on(t.productId, t.effectiveDate),
  pinnedIdx: index('price_entries_pinned_idx').on(t.productId, t.pinned)
}));

// audit_log
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  field: text('field').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  userId: text('user_id')
});

// price_cache (hash-based for param/product versioning)
export const priceCache = pgTable('price_cache', {
  inputsHash: text('inputs_hash').primaryKey(),
  sku: text('sku').notNull().references(() => products.sku, { onDelete: 'cascade' }),
  finalPvp: numeric('final_pvp', { precision: 12, scale: 4 }).notNull(),
  breakdown: jsonb('breakdown').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow()
});

// Helper: soft delete predicate view suggestion (actual view created via raw SQL migration if needed)
export const activeProductsViewName = 'active_products';
