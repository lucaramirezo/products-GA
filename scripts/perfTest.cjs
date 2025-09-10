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
    console.log('🔍 Measuring SELECT 1 latency (5 attempts)...');
    const latencies = [];
    
    for (let i = 1; i <= 5; i++) {
      const start = Date.now();
      await client.query('SELECT 1');
      const end = Date.now();
      const latency = end - start;
      latencies.push(latency);
      console.log(`  Attempt ${i}: ${latency}ms`);
    }
    
    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    console.log(`📊 Median SELECT 1 latency: ${median}ms`);
    
    // Test a typical mutation (insert a product)
    console.log('\n🔄 Testing mutation performance...');
    const mutationStart = Date.now();
    
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO products(sku, name, category, provider_id, cost_sqft, area_sqft, active_tier, active) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (sku) DO UPDATE SET 
        name = EXCLUDED.name,
        cost_sqft = EXCLUDED.cost_sqft
    `, ['TEST-PERF', 'Performance Test Product', 'test', 1, 2.5, 1, 1, true]);
    await client.query('COMMIT');
    
    const mutationEnd = Date.now();
    const mutationTime = mutationEnd - mutationStart;
    
    console.log(`📊 Mutation time: ${mutationTime}ms`);
    
    // Clean up test data
    await client.query(`DELETE FROM products WHERE sku = 'TEST-PERF'`);
    
  } catch(e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error during performance test:', e.message);
  } finally {
    await client.end();
  }
})();
