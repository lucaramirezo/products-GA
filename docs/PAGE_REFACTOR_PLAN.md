# Migration Plan: `src/app/page.tsx` → DB + Componentization

## LIVE MIGRATION CHECKLIST

### Phase 1: Database Layer ✅
- [x] Create `getInitialData.ts` query function
- [x] Create server actions for all entities
  - [x] `productMutations.ts` (updateProduct, createProduct, softDeleteProduct)
  - [x] `paramsMutations.ts` (updateParams)
  - [x] `tiersMutations.ts` (updateTier)
  - [x] `categoryRulesMutations.ts` (upsertRule, deleteRule)
  - [x] `providerMutations.ts` (simulateImport, updateProvider)

### Phase 2: Component Extraction ✅
- [x] Extract `ProductsAppClient.tsx` (main client component)
- [x] Extract `ProductsTable.tsx` (product list & inline edits)
- [x] Extract `ProductDrawer.tsx` (detailed product editor)
- [x] Extract `ParamsPanel.tsx` (global price parameters)
- [x] Extract `TiersPanel.tsx` (tier multipliers & ink factors)
- [x] Extract `CategoryRulesPanel.tsx` (per-category overrides)
- [x] Extract `ProvidersPanel.tsx` (provider info & import simulation)
- [x] Extract `ReportsPanel.tsx` (KPIs, cost changes, min applications)
- [x] Extract shared UI components (TabButton, Th, Td, KPI, Field, ParamInput, AddCategoryForm)

### Phase 3: Server Component Migration ✅
- [x] Convert `page.tsx` to server component
- [x] Wire up `getInitialData()` call
- [x] Mount `ProductsAppClient` with initial data

### Phase 4: State Migration ✅
- [x] Replace `products` mock state with DB queries/actions
- [x] Replace `tiers` mock state with DB queries/actions
- [x] Replace `params` mock state with DB queries/actions
- [x] Replace `categoryRules` mock state with DB queries/actions
- [x] Replace `providers` mock state with DB queries/actions
- [x] Replace `audit` mock state with DB queries/actions

### Phase 5: Integration & Testing ✅
- [x] Test pricing engine parity
- [x] Test CSV export functionality
- [x] Test reports functionality
- [x] Test editing workflows
- [x] Test audit logging
- [x] Test cache invalidation
- [x] Full build and runtime verification

## 1. Goal
Refactor the current monolithic `page.tsx` (all state in React) to:
- Replace hardcoded/mock state with data persisted in Postgres via **Drizzle ORM**.
- Split UI into reusable components.
- Preserve **all existing features** (pricing engine, reports, editing, drawer).
- Enable persistence, auditing, and cache invalidation.

---

## 2. Current Issues
- `page.tsx` holds all state (`products`, `tiers`, `params`, `providers`, `categoryRules`, `audit`) locally.
- No persistence: changes are lost on reload.
- Audit log simulated in memory.
- File is too large and mixes UI + business logic.

---

## 3. Target Architecture
- **Server Component (`page.tsx`)**
  - Calls `getInitialData()` to fetch all entities from DB.
  - Renders `<ProductsAppClient initialData={...} />`.

- **Client Component (`ProductsAppClient.tsx`)**
  - Holds UI state initialized from props.
  - Uses `useMemo` to compute priced rows via `buildPricedProductRow`.
  - Calls **server actions** to persist changes.

- **Server Layer**
  - `src/server/queries/getInitialData.ts`
    - Returns `{ products, tiers, params, categoryRules, providers, auditLog }`.
  - `src/server/actions/*`:
    - `productMutations.ts`: `updateProduct`, `createProduct`, `softDeleteProduct`.
    - `paramsMutations.ts`: `updateParams`.
    - `tiersMutations.ts`: `updateTier`.
    - `categoryRulesMutations.ts`: `upsertRule`, `deleteRule`.
    - `providerMutations.ts`: `simulateImport`, `updateProvider`.
  - All actions:
    - Write to DB via Drizzle.
    - Insert into `audit_log`.
    - Invalidate `price_cache` if needed.

---

## 4. Components (`src/components/`)
- `ProductsTable.tsx` — product list & inline edits.
- `ProductDrawer.tsx` — detailed product editor.
- `ParamsPanel.tsx` — global price parameters.
- `TiersPanel.tsx` — tier multipliers & ink factors.
- `CategoryRulesPanel.tsx` — per-category overrides.
- `ProvidersPanel.tsx` — provider info & import simulation.
- `ReportsPanel.tsx` — KPIs, cost changes, min applications.
- Shared UI: `TabButton`, `Th`, `Td`, `KPI`, `Field`, `ParamInput`, `AddCategoryForm`.

---

## 5. Data Flow
**Read**
```

DB → getInitialData() → ProductsAppClient(initialData)

```

**Write**
```

Client → Server Action → Drizzle Update → Audit Log → Cache Invalidation
→ Return updated entity → Optimistic UI update

```

---

## 6. Migration Steps
1. Create `getInitialData.ts` to fetch from DB.
2. Convert `page.tsx` into a server component that mounts `ProductsAppClient`.
3. Move existing JSX blocks into separate components.
4. Implement server actions for each entity (products, tiers, params, providers, category rules).
5. Replace `useState` mocks with server-driven state + actions.
6. Test: pricing parity, CSV export, reports, editing workflows.

---

## 7. Checklist (State → DB)
- `products` → `products` table
- `tiers` → `tiers` table
- `params` → `price_params` table
- `categoryRules` → `category_rules` table
- `providers` → `providers` table
- `audit` → `audit_log` table

---

## 8. Testing
- **Unit**: pricing engine (already implemented).
- **Integration**: server actions persist & audit correctly.
- **Manual**: edit product/params → DB updated → audit grows → cache invalidated.

---

## 9. Definition of Done
- `page.tsx` only mounts `<ProductsAppClient />`.
- All initial data loaded from DB (no mocks).
- UI split into components.
- All changes persisted with audit log entries.
- Tests and build pass.

---

## 10. Next Improvements (post-migration)
- Pagination + server-side search.
- Audit explorer with filters.
- Redis cache for distributed invalidation.
- Role-based permissions.
