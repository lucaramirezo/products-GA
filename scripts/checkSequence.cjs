const { Pool } = require('pg');

async function checkSequence() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking for sku_seq sequence...');
    
    // Check if sequence exists
    const seqCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_name = 'sku_seq'
      ) as exists;
    `);
    
    console.log('Sequence exists:', seqCheck.rows[0].exists);
    
    if (!seqCheck.rows[0].exists) {
      console.log('Creating sku_seq sequence...');
      await pool.query(`
        CREATE SEQUENCE sku_seq START 0 MINVALUE 0;
      `);
      
      console.log('Setting products.sku default...');
      await pool.query(`
        ALTER TABLE products 
        ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0');
      `);
      
      console.log('Sequence created successfully!');
    }
    
    // Check current sequence value
    const currentVal = await pool.query(`SELECT currval('sku_seq') as current_value;`);
    console.log('Current sequence value:', currentVal.rows[0].current_value);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSequence();