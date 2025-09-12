import { pgTable, text, uuid, smallint, numeric, integer, boolean, timestamp, bigserial, jsonb, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// providers
export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  lastUpdate: timestamp('last_update', { withTimezone: true }).defaultNow()
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
  providerId: uuid('provider_id').notNull().references(() => providers.id, { onUpdate: 'cascade' }),
  costSqft: numeric('cost_sqft', { precision: 12, scale: 4 }).notNull(),
  areaSqft: numeric('area_sqft', { precision: 10, scale: 3 }).notNull().default(sql`1`),
  activeTier: smallint('active_tier').notNull().references(() => tiers.id),
  overrideMultiplier: numeric('override_multiplier', { precision: 10, scale: 4 }),
  overrideNumberOfLayers: integer('override_number_of_layers'),
  inkEnabled: boolean('ink_enabled').notNull().default(true),
  lamEnabled: boolean('lam_enabled').notNull().default(false),
  cutEnabled: boolean('cut_enabled').notNull().default(false),
  sheetsCount: integer('sheets_count'),
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
  tierIdx: index('products_active_tier_idx').on(t.activeTier)
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
  roundingStep: numeric('rounding_step', { precision: 10, scale: 4 }).notNull(),
  costMethod: text('cost_method').notNull().default(sql`'latest'`),
  defaultTier: smallint('default_tier').notNull().references(() => tiers.id)
}, (t) => ({
  inkPriceNonNegative: check('price_params_ink_price_non_negative', sql`${t.inkPrice} >= 0`),
  laminationPriceNonNegative: check('price_params_lamination_price_non_negative', sql`${t.laminationPrice} >= 0`),
  cutPriceNonNegative: check('price_params_cut_price_non_negative', sql`${t.cutPrice} >= 0`),
  roundingStepPositive: check('price_params_rounding_step_positive', sql`${t.roundingStep} > 0`),
  costMethodCheck: check('price_params_cost_method_valid', sql`${t.costMethod} = 'latest'`)
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
