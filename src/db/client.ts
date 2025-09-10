import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

type DbGlobal = {
  __pgPool?: Pool;
  __drizzleDb?: ReturnType<typeof drizzle>;
};
const g = globalThis as unknown as DbGlobal;

export function getPool() {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // ssl: { rejectUnauthorized: false }, // habilitar si el proveedor lo exige
    });
  }
  return g.__pgPool!;
}

export function getDb() {
  if (!g.__drizzleDb) {
    g.__drizzleDb = drizzle(getPool());
  }
  return g.__drizzleDb!;
}

// Legacy function for compatibility - now uses pooled connection
export function createDbClient() {
  const db = getDb();
  return { db, client: null }; // client is deprecated, use db directly
}
