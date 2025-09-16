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
  
  console.log('Creating SKU sequence...');
  try{
    await client.query('CREATE SEQUENCE IF NOT EXISTS sku_seq START 100;');
    console.log('SKU sequence created successfully');
  }catch(e){
    console.error('Failed creating sequence:', e.message);
  }
  
  await client.end();
})();
