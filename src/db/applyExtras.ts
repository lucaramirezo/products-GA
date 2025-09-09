import 'dotenv/config';
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  const sqlFile = resolve(process.cwd(), 'drizzle', '0002_manual_extras.sql');
  const sql = readFileSync(sqlFile, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Extras applied');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed applying extras', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
