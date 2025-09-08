# PRD — Product Management App (v1.3 Draft)

**Date:** 2025-09-08 (updated v1.3 draft)
**Owner:** \[Your name]

---

## 1) Vision

A super simple app that transforms the current Excel into a **“live master”** of products: quick lookup, automatic pricing rules by **tiers** and **overrides**, and clean export. No complex dependencies.

## 2) Objectives

* Eliminate repetitive manual updates of sale prices (PVP).
* Maintain a central product table with instant access (web/mobile).
* Configure and apply pricing rules **Tier 1–5** + **Override (Free)**.
* Allow quick edits of costs and minimums.

## 3) Scope (MVP)

* Central **Products** table with search.
* **Pricing Engine** with Tiers and Overrides (product/category).
* **Price Parameters Panel** (ink, lamination, cutting, rounding, minimums).
* **CSV Export** (visible products or full catalog).
* Roles: **Admin** (full) and **Operator** (read-only).

> **Not included in MVP**: automatic Excel migration and invoice ingestion. Left as **future improvements**.

## 4) Users and Roles

* **Admin**: CRUD for products/providers/rules, changes global parameters, exports.
* **Operator**: search, view, limited export.

## 5) Pricing Model

### 5.1 Global Parameters (Implemented in mock)

| Param | Description | Default | Status |
|-------|-------------|---------|--------|
| `ink_price` | Ink cost per ft² | 0.55 | Implemented |
| `lamination_price` | Lamination cost per ft² | 0 | Implemented |
| `cut_price` | Cutting cost (per ft² or per sheet) | 0 | Implemented |
| `cut_unit` | `per_sqft` \| `per_sheet` | per_sqft | Implemented |
| `rounding_step` | Rounds final PVP up to nearest step | 0.05 | Implemented |
| `min_pvp_global` | Global minimum PVP per ft² | 0 | Implemented |
| `cost_method` | Cost valuation method | latest | Stub (future others) |
| `default_tier` | Preselected tier for new products | 1 | Implemented |

### 5.2 Tiers

| Tier                |       Multiplier |      Ink Factor | Notes                               |
| ------------------- | ---------------: | --------------: | ----------------------------------- |
| **Tier 1**          |             ×3.5 |              ×1 | Adds 1x ink              |
| **Tier 2**          |             ×4.0 |              ×1 | Adds 1× ink                         |
| **Tier 3**          |             ×4.3 |              ×2 | Adds 2× ink                         |
| **Tier 4**          |             ×4.5 |              ×2 | Adds 2× ink                         |
| **Tier 5**          |             ×5.0 |              ×2 | Adds 2× ink                         |
| **Override (Free)** | ×`mult_override` | ×`ink_override` | Defined per category and/or product |

> **Minimums**: `min_pvp` can be defined per **product** and/or **category** (precedence below).

### 5.3 Formulas (v1.3 refined)

**Base variables**

* `cost_sqft`: cost per ft² (editable)
* `area_sqft`: effective area (≥ 0.01; default 1)
* `tier`: `{multiplier, ink_factor}` (Tier 1..5)
* `override_multiplier?`, `override_ink_factor?` (product > category)
* `min_pvp_*`: minimum per ft² (product, category, global)
* `ink_enabled`, `lam_enabled`, `cut_enabled` (bool flags)
* `ink_price`, `lamination_price`, `cut_price`, `cut_unit`
* `sheets_count` (used if `cut_unit = per_sheet`, fallback = `area_sqft`)

**Effective values**

```
mult_eff         = override_multiplier ?? tier.multiplier
ink_factor_eff   = override_ink_factor ?? tier.ink_factor
min_per_sqft_eff = max(min_pvp_product, min_pvp_category, min_pvp_global, 0)
```

**1) Base**

```
base_per_sqft = cost_sqft × mult_eff
base_total    = base_per_sqft × area_sqft
```

**2) Add-ons (optional)**

```
ink_add = ink_enabled ? (ink_price × ink_factor_eff × area_sqft) : 0
lam_add = lam_enabled ? (lam_price × area_sqft) : 0

cut_add = 0
if cut_enabled:
  if cut_unit == "per_sqft":
    cut_add = cut_price × cut_factor × area_sqft
  else if cut_unit == "per_sheet":
    cut_add = cut_price × cut_factor × sheets_count   // if sheets_count missing, fallback to per_sqft
```

**3) Composition & minimum scaling**

```
addons_total = ink_add + lam_add + cut_add
pvp_raw      = base_total + addons_total
min_total    = min_per_sqft_eff × area_sqft
pvp_min_apl  = max(pvp_raw, min_total)
PVP_final    = round_up(pvp_min_apl, rounding_step)  // e.g., €0.05

// Useful derived
PVP_final_per_sqft = area_sqft > 0 ? PVP_final / area_sqft : PVP_final
```

**Notes / Implementation Clarifications**

* Minimum logic: UI surfaces whether a minimum was applied (flag).
* Rounding: always upward (ceiling) to nearest `rounding_step`.
* `cut_factor` not yet modeled (assumed 1); add later if needed.
* Margin heuristic warning threshold (<15%) is hard-coded; should become configurable param.

### 5.4 Rule Precedence

1. **Product Override** (mult/ink/min)
2. **Category Override** (mult/ink/min)
3. **Active Tier** of the product
4. **Global Parameters**

## 6) Data (Minimum functional)

**products (implemented extended)**

| Field | Type | Notes |
|-------|------|-------|
| `sku*` | string | Unique ID |
| `name` | string | Name |
| `category` | string | Category label |
| `default_provider` (providerId) | string | FK provider |
| `cost_sqft` | number | Cost per ft² |
| `area_sqft` | number | Area scaling (default 1) |
| `active_tier` | 1..5 | Tier selection |
| `min_pvp?` | number | Min per ft² (product) |
| `override_multiplier?` | number | Product override mult |
| `override_ink_factor?` | number | Product override ink factor |
| `ink_enabled?` | bool | Add-on flag |
| `lam_enabled?` | bool | Add-on flag |
| `cut_enabled?` | bool | Add-on flag |
| `sheets_count?` | number | Used if cut per sheet |
| `active` | bool | Status |

**providers**

* `id*`, `name`, `last_update?`

**price_params** (single record)

`ink_price`, `lamination_price`, `cut_price`, `cut_unit`, `rounding_step`, `min_pvp_global?`, `cost_method`, `default_tier`

**category\_rules**

* `category*`, `min_pvp?`, `override_multiplier?`, `override_ink_factor?`

**audit\_log**

* `entity`, `id`, `field`, `before`, `after`, `date`, `user`

## 7) UI/UX (MVP)

* **Home** → tabs: **Products | Providers | Parameters | Reports (basic)**

* **Products (table)** (current mock)

  * Columns: `SKU | Product | Provider | Category | Cost/ft² | Tier | Base | Ink | Lam | Cut | Add-ons | Final | Min/ft² | Area | Active`
  * Search (name, category, provider, SKU)
  * Actions implemented: edit cost, area, min per ft², toggles (ink/lam/cut), active tier, overrides, activate/deactivate, add product, CSV export (filtered/all)
  * Drawer shows breakdown & tier preview. Future: inline quick-edit & validation states.

* **Providers**

  * Simple list with `name` and `last_update` (manual in MVP)

* **Parameters**

  * Form with `ink_price (€/ft²)`, `lamination_price (€/ft²)`, `cut_price`, `cut_unit (per_sqft|per_sheet)`, `rounding_step`, `min_pvp_global (ft²)` and default `tier` selection

* **Reports (basic)**

  * KPIs: average margin per active tier, top minimum applications (Δ applied), recent cost changes (audit) — shown now in two panels.

## 8) Key Flows

1. **Lookup**: search → see PVP for all tiers + final PVP for **active tier**
2. **Cost change** (manual): edit `cost_sqft` → recalc PVPs → log in `audit_log`
3. **Configure rules**: global/category/product → apply precedence → recalc view
4. **Export**: CSV (filtered table or full catalog) — implemented.
5. **Add product**: inline button opens drawer with defaults — implemented (auto-saves on change; future: explicit save).

## 9) Validations and Alerts (MVP)

* Margin warning (<15%): implemented (icon). Make threshold configurable.
* Cost empty / zero highlight: zero cost highlighted in red (not blocking). Need explicit empty validation.
* Future: form-level validation & toast notifications.

## 10) Non-Goals (MVP)

* **Automatic migration** from Excel.
* **Invoice ingestion** as cost source.
* Automatic unit conversion (rolls/sheets → sqft).
  *(All postponed to future improvements.)*

## 11) Success Metrics

* ≥80% of queries/responses in ≤2s.
* ≥70% reduction in time to update PVPs compared to Excel.
* 0 critical calculation errors in production.

## 12) Roadmap (high-level)

* **Phase 1 (MVP)**: product table, pricing tiers & overrides, parameters, export, add product UI. (Current mock covers most logic.)
* **Phase 1.1**: configurable margin threshold, role-based read-only mode, improved auditing (params & category edits), unit tests for pricing function, inline edits & bulk actions, CSV import.
* **Phase 2**: Excel migration, invoice ingestion, automatic unit conversion, advanced cost methods (moving / weighted avg), provider API, multi-currency, user auth.
* **Phase 2.1**: performance optimizations (virtualized table), caching, persistent storage (DB), API layer.

---

**Annex**

* Suggested rounding rule: €0.05 (configurable).
* Recommended defaults: `ink_price=0.55`, `lamination_price=1`, `cut_price=20`, `rounding_step=0.05`.
* Tiers mapped to the old Excel: Tier1→3.5 | Tier2→4.0 | Tier3→4.3 | Tier4→4.5 | Tier5→5.0

---

## 13) Implementation Status Snapshot (Mock v1.3)

| Feature | Status | Notes |
|---------|--------|-------|
| Pricing engine (tiers/overrides) | Implemented | Override precedence applied |
| Add-ons (ink/lam/cut) | Implemented | Cut factor & per_sheet refinement pending |
| Per-ft² minimum scaling | Implemented | Flag shown when applied |
| Rounding step | Implemented | Upwards ceiling |
| Product CRUD (create + edit) | Partial | Delete & cancel not added; auto-save only |
| Category rules editing | Implemented | No bulk import yet |
| Global params panel | Implemented | Margin threshold missing |
| CSV export filtered/full | Implemented | Add JSON export later |
| Audit log | Partial | Product field changes only |
| Reports (avg margin, min usage) | Implemented | Add trend charts later |
| Role-based access | Not implemented | Future (Admin vs Operator) |
| Validation & UX alerts | Basic | Need schema + inline errors |
| Persistence / backend | Not implemented | All in-memory |
| Tests (pricing function) | Not implemented | Planned in Phase 1.1 |

### Suggested Next Technical Tasks
1. Extract pure pricing module with unit tests (deterministic snapshot cases).
2. Introduce margin threshold configuration in `price_params`.
3. Add product deletion & cancel-add flow (avoid accidental autosave dirty states).
4. Add role simulation toggle (read-only mode) to validate permission UX.
5. Persist state in localStorage (short term) then plan API layer.
6. CSV import (map columns → fields) & validation report.
7. Virtualized table for >5k products (react-window / partial render).
8. Replace alerts with non-blocking toast system.
9. Add `cut_factor` & `ink_factor` overrides at category level (if needed) with UI.
10. Accessibility pass (keyboard nav, ARIA labels, focus management in drawer).

---

> This v1.3 draft reflects the current mock implementation. For hand-off to another agent, focus first on extraction & tests of pricing logic, then persistence and role enforcement.