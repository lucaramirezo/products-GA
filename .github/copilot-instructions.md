# Products GA - AI Coding Guidelines

## Architecture Overview

This is a **pricing engine** for material products (printing industry) built with strict separation between pure pricing logic and data access layers. The system calculates PVP (sale prices) using deterministic rules with precedence, minimums, and configurable rounding.

### Core Pattern: Dual Repository Implementation
- **Memory repos** (`src/repositories/memory/`) - Current working implementation for rapid development
- **Drizzle repos** (`src/repositories/drizzle/`) - Production database layer (PostgreSQL via Drizzle ORM)
- **Shared interfaces** (`src/repositories/interfaces.ts`) - Contract ensuring swappable implementations
- **Service layer** (`src/services/`) - Orchestrates repos + pure business logic

## Critical Knowledge for AI Agents

### 1. Pure Pricing Engine (No Side Effects)
Location: `src/lib/pricing/`
- **Never import** React, Next.js, or any UI dependencies from this directory
- All functions are deterministic: same input → same output
- Core functions: `computePrice()`, `resolveEffective()`, `roundUp()`
- Types in `types.ts` define the entire domain vocabulary

```typescript
// Example: Pure pricing computation
import { computePrice } from '@/lib/pricing/compute';
const result = computePrice({ product, tier, params, categoryRule, toggles });
```

### 2. Precedence Rules (Business Critical)
From `src/lib/pricing/precedence.ts`:
1. Product overrides (`product.override_multiplier`) - highest priority
2. Category overrides (`category_rules.override_multiplier`) 
3. Tier defaults (`tiers.mult`)
4. Global minimums (`price_params.default_tier`)

**Never bypass** these rules when implementing price calculations.

### 3. Database Schema Patterns
Location: `src/db/schema.ts`
- **snake_case** columns in DB → **camelCase** in TypeScript domain types
- Soft deletes: `deleted_at` timestamp + `active` boolean
- Price caching: `price_cache` table with `inputs_hash` for versioning
- Audit trail: `audit_log` for field-level change tracking

### 4. Repository Layer Rules
- **Always implement interfaces** from `interfaces.ts` - never skip contracts
- Handle `null` vs `undefined` consistently (prefer `null` for missing data)
- **Soft delete pattern**: Filter by `active=true AND deleted_at IS NULL`
- Memory repos for rapid iteration; Drizzle repos for production

### 5. Service Layer Patterns
`PricingService` in `src/services/pricingService.ts`:
- Orchestrates repository calls
- Applies business validation
- **Never contains** pricing math (delegates to pure engine)
- Throws descriptive errors in Spanish (business requirement)

### 6. Development Workflow Commands

**Database Operations:**
```powershell
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Apply pending migrations  
npm run db:seed        # Populate with test data
npm run db:studio      # Open Drizzle Studio
```

**Testing & Build:**
```powershell
npm run test          # Vitest unit tests (pricing engine focus)
npm run dev           # Next.js with Turbopack
npm run build         # Production build
```

**Database Scripts:** All in `scripts/` directory for database utilities.

### 7. Key Files for Context

When implementing features, always check:
- `src/lib/pricing/types.ts` - Domain types and business vocabulary
- `src/repositories/interfaces.ts` - Repository contracts
- `src/db/schema.ts` - Database structure and constraints
- `README.md` - Current implementation status and business rules

### 8. Testing Philosophy
- **Unit tests** for pricing engine (`src/tests/unit/`)
- **Integration tests** for database layer (planned)
- Focus on precedence edge cases, rounding behavior, and business rule validation
- Tests use Vitest with node environment

### 9. Common Patterns

**Adding new business rules:**
1. Update domain types in `types.ts`
2. Modify pure computation in `compute.ts` or `precedence.ts`
3. Add comprehensive unit tests
4. Update both memory and Drizzle repository implementations

**Database changes:**
1. Modify `schema.ts`
2. Run `npm run db:generate`
3. Update repository mappers (`src/repositories/drizzle/mappers.ts`)
4. Apply migration with `npm run db:migrate`

### 10. Code Conventions
- **Spanish error messages** for business users
- **English** for technical/internal logs
- **No `any` types** - use explicit typing
- **Decimal precision**: Use `numeric` DB types for money/pricing fields
- **Timestamps**: Always with timezone (`timestamp with time zone`)

### 11. Tech Stack Summary
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **Database**: PostgreSQL with Drizzle ORM 0.36
- **Testing**: Vitest 2.0
- **Build**: Turbopack for development speed
- **Styling**: Tailwind CSS 4.0

This codebase prioritizes **correctness over convenience** - the pricing engine must be bulletproof since it directly impacts business revenue calculations.