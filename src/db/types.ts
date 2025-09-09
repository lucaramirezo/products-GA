import { products, tiers, categoryRules, priceParams, providers, auditLog } from './schema';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SQL } from 'drizzle-orm';

// Minimal typed surface for Drizzle operations we use (hide generics for lint simplicity)
/*
 * We intentionally relax typing here because Drizzle's fluent generic API is hard to model narrowly
 * without importing its full generic surface. Lint suppressed locally to avoid noise elsewhere.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DrizzleDb { select:()=>{ from<T>(table:T):any }; insert<T>(table:T):any; update<T>(table:T):any; delete<T>(table:T):any }

export type { products, tiers, categoryRules, priceParams, providers, auditLog };