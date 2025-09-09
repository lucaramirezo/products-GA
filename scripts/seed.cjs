#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');
const { Client } = require('pg');

async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){ console.error('DATABASE_URL no definido'); process.exit(1); }
  const c = new Client({ connectionString: url });
  await c.connect();
  try{
    await c.query('BEGIN');
    // Tiers
    await c.query(`INSERT INTO tiers(id,mult,ink_factor) VALUES 
      (1, 3.5, 1), (2, 4.0, 1), (3, 4.3, 2), (4, 4.5, 2), (5, 5.0, 2)
      ON CONFLICT (id) DO NOTHING`);
    // Provider
    const prov = await c.query(`INSERT INTO providers(name) VALUES('Default') ON CONFLICT (name) DO NOTHING RETURNING id`);
    let providerId = prov.rows[0]?.id;
    if(!providerId){ const r = await c.query(`SELECT id FROM providers WHERE name='Default'`); providerId = r.rows[0].id; }
    // Category rules
    await c.query(`INSERT INTO category_rules(category,min_pvp) VALUES('LargeFormat', 6)
      ON CONFLICT (category) DO UPDATE SET min_pvp = EXCLUDED.min_pvp`);
    // Params singleton id=1
    await c.query(`INSERT INTO price_params(id,ink_price,lamination_price,cut_price,cut_unit,rounding_step,min_pvp_global,cost_method,default_tier)
      VALUES (1, 0.55, 1, 20, 'per_sqft', 0.05, 0, 'latest', 1)
      ON CONFLICT (id) DO UPDATE SET 
        ink_price = EXCLUDED.ink_price,
        lamination_price = EXCLUDED.lamination_price,
        cut_price = EXCLUDED.cut_price,
        cut_unit = EXCLUDED.cut_unit,
        rounding_step = EXCLUDED.rounding_step,
        min_pvp_global = EXCLUDED.min_pvp_global,
        cost_method = EXCLUDED.cost_method,
        default_tier = EXCLUDED.default_tier`);
    // Products (include SKU-001 for parity test)
    await c.query(`INSERT INTO products(sku,name,category,provider_id,cost_sqft,area_sqft,active_tier,min_pvp,ink_enabled,lam_enabled,cut_enabled,active)
      VALUES
      ('SKU-001','Vinyl Banner 1m²','LargeFormat',$1,2.1,1,1,5,true,false,false,true),
      ('SKU1','Producto Demo 1','banner',$1,2.5,1,1,NULL,true,false,false,true),
      ('SKU2','Producto Demo 2','banner',$1,3.0,1,2,NULL,true,true,false,true),
      ('SKU3','Producto Demo 3','vinyl',$1,1.8,1,1,NULL,true,false,true,true)
      ON CONFLICT (sku) DO NOTHING`, [providerId]);
    await c.query('COMMIT');
    console.log('Seed complete');
  }catch(e){
    await c.query('ROLLBACK');
    console.error('Seed failed', e);
    process.exit(1);
  }finally{
    await c.end();
  }
}

main();
