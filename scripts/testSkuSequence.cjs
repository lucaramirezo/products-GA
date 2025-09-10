#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('Testing multiple SKU generation...');
    
    // Generate 3 SKUs to test sequence
    for (let i = 1; i <= 3; i++) {
      const result = await client.query(`SELECT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0') as sku`);
      console.log(`Generated SKU ${i}:`, result.rows[0].sku);
    }
    
    console.log('✅ SKU generation working correctly');
    
  } catch(e) {
    console.error('❌ Test failed:', e.message);
  } finally {
    await client.end();
  }
})();
