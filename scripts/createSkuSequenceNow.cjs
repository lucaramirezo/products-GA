const { getDb } = require('../src/db/client.ts');
const { sql } = require('drizzle-orm');

async function createSkuSequence() {
  const db = getDb();
  
  try {
    console.log('Creating sku_seq sequence...');
    
    // Drop existing default if any
    await db.execute(sql`ALTER TABLE products ALTER COLUMN sku DROP DEFAULT`);
    
    // Drop and recreate sequence
    await db.execute(sql`DROP SEQUENCE IF EXISTS sku_seq CASCADE`);
    await db.execute(sql`CREATE SEQUENCE sku_seq START 0 MINVALUE 0`);
    
    // Set new default
    await db.execute(sql`
      ALTER TABLE products 
      ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0')
    `);
    
    console.log('✅ SKU sequence created successfully!');
    
    // Test the sequence
    const result = await db.execute(sql`SELECT nextval('sku_seq') as next_value`);
    console.log('Next SKU will be: SKU-' + String(result[0].next_value).padStart(3, '0'));
    
  } catch (error) {
    console.error('Error creating sequence:', error);
  } finally {
    process.exit(0);
  }
}

createSkuSequence();