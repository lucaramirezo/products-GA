#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('Checking sequence...');
    const seq = await client.query('SELECT nextval(\'sku_seq\')');
    console.log('Next sequence value:', seq.rows[0].nextval);
    
    console.log('Checking column default...');
    const desc = await client.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'sku'
    `);
    console.log('Column default:', desc.rows[0]?.column_default);
    
  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.end();
  }
})();
