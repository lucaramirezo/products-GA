#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){ 
    console.error('DATABASE_URL no definido'); 
    process.exit(1); 
  }
  
  const c = new Client({ connectionString: url });
  await c.connect();
  
  try{
    await c.query('BEGIN');
    
    // Insert test suppliers
    console.log('Inserting suppliers...');
    const supplier1 = await c.query(`
      INSERT INTO suppliers(name, contact_info, payment_terms) 
      VALUES('Acme Materials', 'contact@acme.com', '30 days') 
      ON CONFLICT (name) DO NOTHING 
      RETURNING id
    `);
    let supplier1Id = supplier1.rows[0]?.id;
    if(!supplier1Id){ 
      const r = await c.query(`SELECT id FROM suppliers WHERE name='Acme Materials'`); 
      supplier1Id = r.rows[0].id; 
    }
    
    const supplier2 = await c.query(`
      INSERT INTO suppliers(name, contact_info, payment_terms) 
      VALUES('Best Vinyl Co', 'sales@bestvinyl.com', '15 days') 
      ON CONFLICT (name) DO NOTHING 
      RETURNING id
    `);
    let supplier2Id = supplier2.rows[0]?.id;
    if(!supplier2Id){ 
      const r = await c.query(`SELECT id FROM suppliers WHERE name='Best Vinyl Co'`); 
      supplier2Id = r.rows[0].id; 
    }
    
    // Insert a test purchase
    console.log('Inserting purchase...');
    const purchase = await c.query(`
      INSERT INTO purchases(invoice_no, supplier_id, date, currency, subtotal, tax, shipping, notes)
      VALUES('INV-2024-001', $1, '2024-09-15', 'USD', 500.00, 50.00, 25.00, 'Test purchase for validation')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [supplier1Id]);
    let purchaseId = purchase.rows[0]?.id;
    if(!purchaseId){
      const r = await c.query(`SELECT id FROM purchases WHERE invoice_no='INV-2024-001'`);
      if(r.rows.length > 0) purchaseId = r.rows[0].id;
    }
    
    // Get existing product SKUs for the purchase items
    const existingProducts = await c.query(`SELECT sku FROM products LIMIT 2`);
    if(existingProducts.rows.length === 0){
      console.log('No existing products found. Skipping purchase items.');
    } else {
      const sku1 = existingProducts.rows[0].sku;
      const sku2 = existingProducts.rows.length > 1 ? existingProducts.rows[1].sku : sku1;
      
      // Insert purchase items with different unit types to test triggers
      console.log('Inserting purchase items...');
      await c.query(`
        INSERT INTO purchase_items(purchase_id, product_id, unit_type, units, width, height, uom, unit_cost, generate_price)
        VALUES
        ($1, $2, 'sheet', 10, 48, 96, 'in', 12.50, true),
        ($1, $3, 'roll', 1, 54, NULL, 'in', 85.00, true),
        ($1, NULL, 'sqft', 25, NULL, NULL, 'ft', 3.20, false)
        ON CONFLICT DO NOTHING
      `, [purchaseId, sku1, sku2]);
    }
    
    // Insert price entries for existing products
    console.log('Inserting price entries...');
    const allProducts = await c.query(`SELECT sku FROM products WHERE active = true`);
    
    for(const product of allProducts.rows){
      // Insert a historical price entry
      await c.query(`
        INSERT INTO price_entries(product_id, supplier_id, effective_date, cost_ft2, currency, pinned, notes)
        VALUES($1, $2, '2024-08-01', 2.15, 'USD', false, 'Historical cost from August')
        ON CONFLICT DO NOTHING
      `, [product.sku, supplier2Id]);
      
      // Insert a more recent pinned price entry
      await c.query(`
        INSERT INTO price_entries(product_id, supplier_id, effective_date, cost_ft2, currency, pinned, notes)
        VALUES($1, $2, '2024-09-10', 2.45, 'USD', true, 'Current pinned cost')
        ON CONFLICT DO NOTHING
      `, [product.sku, supplier1Id]);
    }
    
    await c.query('COMMIT');
    console.log('Purchase flow seed data completed successfully');
    
    // Test the view and triggers by querying the results
    console.log('\n--- Testing products_with_cost view ---');
    const viewResult = await c.query(`
      SELECT sku, name, current_cost_ft2 
      FROM products_with_cost 
      ORDER BY sku 
      LIMIT 5
    `);
    console.log('Products with resolved costs:');
    viewResult.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name} -> $${row.current_cost_ft2}/ft²`);
    });
    
    console.log('\n--- Testing purchase_items triggers ---');
    const itemsResult = await c.query(`
      SELECT 
        unit_type, 
        units, 
        width, 
        height, 
        uom,
        area_ft2_per_unit, 
        area_ft2_total, 
        unit_cost,
        total_cost, 
        cost_ft2_line
      FROM purchase_items 
      ORDER BY unit_type
    `);
    console.log('Purchase items with computed fields:');
    itemsResult.rows.forEach(row => {
      console.log(`  ${row.unit_type}: ${row.units} units, ${row.area_ft2_total} ft² total, $${row.cost_ft2_line}/ft²`);
    });
    
  }catch(e){
    await c.query('ROLLBACK');
    console.error('Seed failed:', e);
    process.exit(1);
  }finally{
    await c.end();
  }
}

main();