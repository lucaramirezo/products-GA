#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Existing tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check if we have sequences
    const sequences = await client.query("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'");
    console.log('Existing sequences:', sequences.rows.map(r => r.sequence_name).join(', '));
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
})();
