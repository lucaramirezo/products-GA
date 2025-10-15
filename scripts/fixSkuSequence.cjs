#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('Creating SKU sequence...');
    
    // Drop existing default if any
    await client.query(`ALTER TABLE products ALTER COLUMN sku DROP DEFAULT`);
    
    // Drop and recreate sequence
    await client.query(`DROP SEQUENCE IF EXISTS sku_seq CASCADE`);
    await client.query(`CREATE SEQUENCE sku_seq START 0 MINVALUE 0`);
    
    // Set new default
    await client.query(`
      ALTER TABLE products 
      ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0')
    `);
    
    console.log('✅ SKU sequence created successfully!');
    
    // Test the sequence
    const result = await client.query(`SELECT nextval('sku_seq') as next_value`);
    console.log('Next SKU will be: SKU-' + String(result.rows[0].next_value).padStart(3, '0'));
    
    // Verify it exists
    const sequences = await client.query("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'");
    console.log('Existing sequences:', sequences.rows.map(r => r.sequence_name).join(', '));
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
})();