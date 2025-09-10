#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('Testing SKU auto-generation...');
    
    const result = await client.query(`
      INSERT INTO products (name, category, provider_id, cost_sqft, area_sqft, active_tier, active)
      SELECT 'Test Auto SKU', 'Test', id, 2.5, 1, 1, true
      FROM providers LIMIT 1
      RETURNING sku, name
    `);
    
    console.log('✅ Auto-generated SKU:', result.rows[0]);
    
    // Test multiple inserts
    const multi = await client.query(`
      INSERT INTO products (name, category, provider_id, cost_sqft, area_sqft, active_tier, active)
      SELECT 'Test Auto SKU ' || i, 'Test', p.id, 2.5, 1, 1, true
      FROM providers p, generate_series(1, 3) i
      LIMIT 3
      RETURNING sku, name
    `);
    
    console.log('✅ Multiple auto-generated SKUs:');
    multi.rows.forEach(row => console.log('  -', row.sku, row.name));
    
    // Clean up
    await client.query(`DELETE FROM products WHERE name LIKE 'Test Auto SKU%'`);
    console.log('✅ Test cleanup complete');
    
  } catch(e) {
    console.error('❌ Test failed:', e.message);
  } finally {
    await client.end();
  }
})();
