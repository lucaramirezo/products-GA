import 'dotenv/config';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export function createDbClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  return { client, db: drizzle(client) };
}
