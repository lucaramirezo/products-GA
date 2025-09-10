# Database Implementation Plan (Postgres / Supabase)

## 1. Initial Idea
Persist core entities (products, tiers, category_rules, price_params, providers, audit_log) with minimal normalization and integrity rules (CHECK, FKs, soft delete). Use Drizzle ORM for typed migrations. Initial seed: tiers (PRD v1.3), global params, one provider, three demo products. Audit critical changes (cost_sqft, overrides, minimums, params).

# Database Implementation Plan (Postgres / Supabase)

## 1. Initial Idea

Persist core entities (products, tiers, category_rules, price_params, providers, audit_log) with minimal normalization and integrity rules (CHECK, FKs, soft delete). Use Drizzle ORM for typed migrations. Initial seed: tiers (PRD v1.3), global params, one provider, three demo products. Audit critical changes (cost_sqft, overrides, minimums, params).

## 2. Design (Tables, Fields, Constraints, Indexes)

1. providers

   - id uuid PK default gen_random_uuid(), name text UNIQUE NOT NULL, last_update timestamptz default now()
   - Index: UNIQUE(name)

2. tiers

   - id smallint PK (1..5), mult NUMERIC(10,4) NOT NULL CHECK (mult>0), ink_factor int NOT NULL CHECK (ink_factor>=0)
   - NOTE: column named "mult" to stay consistent with current Next.js mock (`tier.mult`).
   - CHECK (id BETWEEN 1 AND 5)

3. products

    - sku text PK
    - name text NOT NULL
    - category text NOT NULL
    - provider_id uuid NOT NULL REFERENCES providers(id) ON UPDATE CASCADE  -- DB snake_case
    - cost_sqft NUMERIC(12,4) NOT NULL CHECK (cost_sqft>=0)
    - area_sqft NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (area_sqft>0)
    - active_tier smallint NOT NULL REFERENCES tiers(id)
    - min_pvp NUMERIC(12,4) NULL CHECK (min_pvp>=0)
    - override_multiplier NUMERIC(10,4) NULL CHECK (override_multiplier>0)
    - override_ink_factor int NULL CHECK (override_ink_factor>=0)
    - ink_enabled bool NOT NULL DEFAULT true
    - lam_enabled bool NOT NULL DEFAULT false
    - cut_enabled bool NOT NULL DEFAULT false
    - sheets_count int NULL CHECK (sheets_count>=0)
    - active bool NOT NULL DEFAULT true
    - deleted_at timestamptz NULL
    - created_at timestamptz default now(), updated_at timestamptz default now()
    - Triggers: update updated_at on update
    - Indexes:
       - btree(category)
       - btree(provider_id)
       - btree(active_tier)
       - GIN (to_tsvector('simple', name || ' ' || category || ' ' || sku)) for search (optional)
       - Partial: (sku) WHERE deleted_at IS NULL AND active = true
    - Domain model in TS will expose `providerId` (camelCase) mapping to DB `provider_id`.

4. category_rules

   - category text PK
   - min_pvp NUMERIC(12,4) NULL CHECK (min_pvp>=0)
   - override_multiplier NUMERIC(10,4) NULL CHECK (override_multiplier>0)
   - override_ink_factor int NULL CHECK (override_ink_factor>=0)

5. price_params (singleton)

   - id smallint PK DEFAULT 1 CHECK (id=1)
   - ink_price NUMERIC(10,4) NOT NULL CHECK (ink_price>=0)
   - lamination_price NUMERIC(10,4) NOT NULL CHECK (lamination_price>=0)
   - cut_price NUMERIC(10,4) NOT NULL CHECK (cut_price>=0)
   - cut_unit text NOT NULL CHECK (cut_unit IN ('per_sqft','per_sheet'))
   - rounding_step NUMERIC(10,4) NOT NULL CHECK (rounding_step>0)
   - min_pvp_global NUMERIC(12,4) NULL CHECK (min_pvp_global>=0)
   - cost_method text NOT NULL DEFAULT 'latest' CHECK (cost_method='latest')
   - default_tier smallint NOT NULL DEFAULT 1 REFERENCES tiers(id)

6. audit_log

   - id bigserial PK
   - entity text NOT NULL
   - entity_id text NOT NULL
   - field text NOT NULL
   - before jsonb, after jsonb
   - at timestamptz NOT NULL DEFAULT now()
   - user_id text NULL
   - Indexes: (entity, entity_id), (at DESC)

7. price_cache (optional)

   - sku text PK REFERENCES products(sku) ON DELETE CASCADE
   - final_pvp NUMERIC(12,4) NOT NULL
   - source text NOT NULL
   - inputs_hash text NOT NULL UNIQUE
   - computed_at timestamptz DEFAULT now()
   - Index: (computed_at DESC)

8. Views

   - active_products AS SELECT * FROM products WHERE deleted_at IS NULL AND active = true;

9. Soft delete

   - Set deleted_at, never remove row.

10. Monetary precision

- Use NUMERIC; arithmetic happens in logic layer.

## 3. Migrations (Drizzle)

Install:

```bash
npm i drizzle-orm pg dotenv
npm i -D drizzle-kit
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgres',
  dbCredentials: { url: process.env.DATABASE_URL! }
});
```

Steps:

1. Create `src/db/schema.ts`.
2. Generate: `npx drizzle-kit generate`
3. Apply: `npx drizzle-kit up`

Creation order (if separated): tiers → providers → category_rules → price_params → products → audit_log → price_cache → views/indexes.

Rollback:

- Backup: `pg_dump $Env:DATABASE_URL -Fc -f pre_schema.dump`
- Restore: `pg_restore -c -d $Env:DATABASE_URL pre_schema.dump`

Store manual down SQL (if needed) in `drizzle/_manual_down.sql`.

## 4. Seed & Params

Script `src/db/seed.ts`:

1. Insert tiers (PRD v1.3): (1,3.5,1),(2,4.0,1),(3,4.3,2),(4,4.5,2),(5,5.0,2)  // Note: change Tier1 ink_factor to 0 if legacy mapping desired.
2. Insert provider: "Default".
3. Insert price_params (id=1): ink_price=0.55, lamination_price=1, cut_price=20, cut_unit='per_sqft', rounding_step=0.05, min_pvp_global=0, default_tier=1.
4. Insert 3 products (sample SKUs) with representative flags.

Run (PowerShell):

```powershell
node --loader ts-node/esm .\src\db\seed.ts
```

## 5. Auditing

Per-field diff logging (one row per changed field) inside a transaction.

Tracked:

- products: cost_sqft, area_sqft, active_tier, min_pvp, override_multiplier, override_ink_factor, ink_enabled, lam_enabled, cut_enabled, sheets_count, active, deleted_at
- category_rules: min_pvp, override_multiplier, override_ink_factor
- price_params: all but id
- tiers (if editable): multiplier, ink_factor

Capture user_id (placeholder 'system' until auth). Service layer compares previous vs new and inserts rows in bulk.

## 6. Risks & Backout

| Risk | Mitigation | Backout |
|------|------------|---------|
| Tier1 ink_factor discrepancy | Comment + test precedence | Update tiers + recalc cache |
| Floating rounding errors | Use NUMERIC + decimal lib in code | Recompute cache |
| Missing search index | Add tsvector index | Create index concurrently |
| Destructive migration | pg_dump before deploy | pg_restore dump |
| Incomplete audit coverage | Unit test diff logic | Manual diff + patch rows |

## 7. Checklist “DONE”

1. Migrations apply cleanly (local/staging)
2. Tables+constraints+views exist
3. Seed executed (tiers=5, products=3, params=1)
4. Invalid insert (negative mult) fails
5. Audit rows created on cost_sqft & rounding_step change
6. Backup + restore tested
7. Join query products+tiers returns expected fields
8. README updated (DB section)
9. price_cache implemented or explicitly skipped with rationale
10. Tier1 ink_factor note documented
9. price_cache implemented or explicitly skipped with rationale
10. Tier1 ink_factor note documented

## 8. Implementation Progress (Live)

- [x] Define core tables (products, tiers, providers, category_rules, price_params, audit_log)
- [x] Add constraints, checks, indexes
- [x] Manual SQL extras (trigger updated_at, active_products view, partial + audit indexes)
- [x] Seed script baseline data
- [x] Drizzle repository implementations
- [x] In-memory caching layer (short TTL) for pricing
- [x] Persistent `price_cache` table (hash + breakdown) added (migration 0003)
- [x] Wire server action `computePriceAction` to choose DB container when `DATABASE_URL` present (fallback memory)
- [x] Integration test skeleton for DB-backed pricing vs in-memory parity (`pricingDbParity.test.ts`)
- [ ] Document audit usage examples
- [ ] Cache invalidation on mutations (products / params) & audit emission

## 9. Immediate Next Steps

1. Modify `src/server/actions/computePriceAction.ts` to dynamically select DB services.
2. Add test harness creating an ephemeral DB schema (or using a test schema) for integration tests.
3. Implement mutation service (e.g., updateProduct) performing diff -> audit -> invalidate `price_cache`.
4. Write docs snippet on how to query recent changes from `audit_log`.
5. (Optional) Add TTL eviction job for stale `price_cache` rows (or rely on periodic cleanup SQL).
