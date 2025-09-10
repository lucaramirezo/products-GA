#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

(async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL no definido. No se puede verificar conectividad.');
    process.exit(1);
  }
  
  console.log('Verificando conectividad con DATABASE_URL...');
  const client = new Client({ connectionString: url });
  
  try {
    const start = Date.now();
    await client.connect();
    const result = await client.query('SELECT 1 as test');
    const end = Date.now();
    
    console.log('✅ Conectividad OK');
    console.log(`✅ SELECT 1 ejecutado correctamente: ${result.rows[0].test}`);
    console.log(`⏱️  Latencia: ${end - start}ms`);
    
    // Basic DB info
    const version = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL: ${version.rows[0].version.split(',')[0]}`);
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error de conectividad:', e.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();