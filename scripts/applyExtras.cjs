#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { readFileSync } = require('fs');
const { resolve } = require('path');
const { Client } = require('pg');

(async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL no definido. Aborta extras.');
    process.exit(0);
  }
  const sqlFile = resolve(process.cwd(), 'drizzle', '0002_manual_extras.sql');
  const sql = readFileSync(sqlFile, 'utf8');
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Extras applied');
  } catch(e){
    await client.query('ROLLBACK');
    console.error('Failed applying extras', e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
