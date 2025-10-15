#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { readFileSync } = require('fs');
const { resolve } = require('path');
const { Client } = require('pg');

(async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL no definido. Aborta migración.');
    process.exit(1);
  }
  
  const migrationFile = '0009_add_unit_price_to_purchase_items.sql';
  const migrationPath = resolve(process.cwd(), 'drizzle', migrationFile);
  
  const client = new Client({ connectionString: url });
  await client.connect();
  
  try {
    const sql = readFileSync(migrationPath, 'utf8');
    console.log('Aplicando migración:', migrationFile);
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migración aplicada exitosamente');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error aplicando migración:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();