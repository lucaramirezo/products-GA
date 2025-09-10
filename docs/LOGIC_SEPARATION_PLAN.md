# Logic Separation Plan (Next.js App Router / TypeScript)

## 1. Initial Idea
Extract deterministic pricing engine (formulas + precedence + rounding) into pure modules under `src/lib/pricing` with strong typing and Vitest tests. UI only invokes a server action / service returning a serializable breakdown. Repositories encapsulate Drizzle DB access; services orchestrate pricing, auditing, optional caching. Remove pricing logic from `page.tsx`.

## 2. Folder Topology (Target)

```text
src/
  app/
    page.tsx                  (adapted: uses server action)
    api/
      pricing/route.ts        (optional REST endpoint)
  components/
    PricingForm.tsx
    ResultCard.tsx
  lib/
    pricing/
      types.ts
      rounding.ts
      precedence.ts
      compute.ts
    utils/
      decimal.ts
  repositories/
    productsRepo.ts
    tiersRepo.ts
    categoryRulesRepo.ts
    paramsRepo.ts
  services/
    pricingService.ts
    auditService.ts
    cacheService.ts (optional)
  server/
    actions/
      computePriceAction.ts
  db/
    schema.ts
    client.ts
  types/
    domain.ts (if kept separate)
  tests/
    unit/
      rounding.test.ts
      precedence.test.ts
      compute.test.ts
    integration/
      pricingService.test.ts
      auditService.test.ts
```

## 3. Contracts (Key Types & Signatures)

  `lib/pricing/types.ts` excerpt (names aligned with current `page.tsx` mock):

  ```ts
  export interface Tier { id:number; mult:number; ink_factor:number; }
  export interface Product {
    sku:string; name:string; category:string; providerId:string; cost_sqft:number; area_sqft:number; active_tier:number;
    min_pvp?:number; override_multiplier?:number; override_ink_factor?:number;
    ink_enabled?:boolean; lam_enabled?:boolean; cut_enabled?:boolean; sheets_count?:number; active:boolean;
  }
  export interface CategoryRule {
    category:string;
    min_pvp?:number; override_multiplier?:number; override_ink_factor?:number;
  }
  export interface PriceParams {
    ink_price:number; lamination_price:number; cut_price:number;
    cut_unit:'per_sqft'|'per_sheet'; rounding_step:number;
    min_pvp_global?:number; default_tier:number;
  }
  export interface Effective {
    mult:number; ink_factor:number; min_per_sqft?:number; sources:string[];
  }
  export interface ComputeContext {
    product:Product; tier:Tier; params:PriceParams; categoryRule?:CategoryRule;
    toggles:{ ink:boolean; lam:boolean; cut:boolean; };
    sheets_override?:number;
  }
  export interface PriceBreakdown {
    base_total:number; addons_total:number; min_total:number;
    final:number; final_per_sqft:number;
    applied_min:boolean; applied_min_source:'product'|'category'|'global'|null;
    effective:Effective;
  }
  ```

  Pure functions:

  ```ts
  export function resolveEffective(ctx:{product:Product; tier:Tier; categoryRule?:CategoryRule; params:PriceParams;}): Effective;
  export function roundUp(value:number, step:number): number;
  export function computePrice(ctx:ComputeContext): PriceBreakdown;
  ```

  Service:

  ```ts
  export async function getPriceBySku(sku:string, toggles:{ink:boolean;lam:boolean;cut:boolean;sheets?:number;}): Promise<PriceBreakdown>;
  ```

## 4. Precedence

  1. Product overrides (mult / ink_factor / min)
  2. Category overrides
  3. Tier (active_tier)
  4. Global (min_pvp_global only for minimum)

  Algorithm `resolveEffective`:

- mult = product.override_multiplier ?? category.override_multiplier ?? tier.mult
- ink_factor = product.override_ink_factor ?? category.override_ink_factor ?? tier.ink_factor
- min_per_sqft = max(defined(product.min_pvp, category.min_pvp, params.min_pvp_global, 0))
- sources[] collects origin tags (e.g., 'product.multiplier', 'tier.ink_factor', 'global.min')

  Edge tests: no overrides, category only, product only, both, no mins.

## 5. UI Integration

  Flow:

  1. Form sends (sku, toggles, sheets?) to `computePriceAction`.
  2. Action loads product, tier, categoryRule, params (parallel) → calls service → returns breakdown.
  3. UI shows breakdown (ResultCard) and min flag.
  4. Mutations (product/params updates) trigger audit + optional cache invalidation.

  Props:

- `<PricingForm products={list} onCompute={(sku,toggles)=>...} />`
- `<ResultCard data={breakdown} />`

## 6. Tests

  Unit (Vitest):

  1. rounding.test.ts → boundaries: step 0.05 (1.00→1.00,1.001→1.05,1.05→1.05,1.051→1.10)
  2. precedence.test.ts → 5 scenarios (tier only, category, product, both, global min)
  3. compute.test.ts → cases: no add-ons; ink+lam; cut per_sqft vs per_sheet; global min applies
  4. Edge: area_sqft=0.01, missing sheets_count fallback

  Integration:

1. pricingService.test.ts (mock repos)
2. auditService.test.ts (field diff)

  Command:

  ```bash
  npm i -D vitest @types/node
  npx vitest run
  ```

## 7. Rollout

  1. Create `lib/pricing/*` (pure) + tests (no UI changes yet) using names: Tier.mult, Product.providerId.
  2. Add Drizzle repos + `pricingService` (read-only first).
  3. Implement `computePriceAction.ts`; integrate in `page.tsx` under feature flag `USE_NEW_ENGINE`.
  4. Compare legacy vs new outputs (console assertions).
  5. Remove old pricing logic from React components.
  6. Add audit integration for mutations.
  7. (Optional) Implement `price_cache` + invalidation (updates to product/params).
  8. Drop flag and document in README.

## 8. Checklist & Status (Actualizar conforme avanza)

Legend: [x] completado · [ ] pendiente · [~] parcial

1. [x] Pure functions (resolveEffective, roundUp, computePrice) aisladas de React/DB
2. [x] Tipos de dominio centrales (`types.ts`) consolidados
3. [~] ≥10 unit tests + 2 integration tests verdes (unit OK, integración pendiente)
4. [x] Server action devuelve breakdown correcto para ≥3 SKUs (seed en `computePriceAction.ts`)
5. [x] UI sin matemáticas de negocio (solo consumo de datos)
6. [x] Lógica legacy eliminada de `page.tsx`
7. [x] Auditoría de cambios (nivel UI en memoria; persistencia DB pendiente)
8. [x] README documenta flujo y arquitectura
9. [x] Cache implementada (in-memory TTL 5s) y decisión documentada (suficiente para prototipo; Redis opcional futuro)
10. [x] Nota histórica sobre ajuste de `ink_factor` Tier1: ver sección README DB (comentario en seed y plan)

Notas próximas acciones:

- Crear `db/schema.ts` y migraciones (desbloquea repos Drizzle + tests integración)
- Añadir integración `pricingService.test.ts` y `auditService.test.ts` (cubre item 3 al 100%)
- Documentar decisión de cache (mem/redis/none) → cerrar item 9
- Agregar comentario histórico sobre `ink_factor` inicial de Tier1 → cerrar item 10
