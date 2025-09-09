#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { readdirSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { Client } = require('pg');

(async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL no definido. Aborta migraciones.');
    process.exit(1);
  }
  const dir = resolve(process.cwd(), 'drizzle');
  const files = readdirSync(dir)
    .filter(f => /^000\d_.*\.sql$/.test(f))
    .filter(f => f !== '0002_manual_extras.sql')
    .sort();
  if(files.length===0){ console.log('No migration SQL files found'); process.exit(0); }
  const client = new Client({ connectionString: url });
  await client.connect();
  try{
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  }catch(e){ console.warn('Could not create pgcrypto extension (ignored):', e.message); }
  for(const f of files){
    const sql = readFileSync(resolve(dir, f), 'utf8');
    console.log('Applying', f);
    try{
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Applied', f);
    }catch(e){
      await client.query('ROLLBACK');
      console.error('Failed applying', f, e);
      process.exit(1);
    }
  }
  await client.end();
  console.log('All migrations applied');
})();
