#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL no definido');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: url });
  await client.connect();
  
  try {
    const tables = ['tiers', 'providers', 'category_rules', 'price_params', 'products'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} rows`);
    }
  } catch(e) {
    console.error('Error counting tables:', e.message);
  } finally {
    await client.end();
  }
})();
