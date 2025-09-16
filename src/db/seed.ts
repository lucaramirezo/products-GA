import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { providers, tiers, priceParams, products, categoryRules } from './schema';
import { sql } from 'drizzle-orm';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  console.log('Seeding database...');
  await db.transaction(async (tx) => {
    // tiers (id, mult, number_of_layers)
    await tx.insert(tiers).values([
      { id: 1, mult: '3.5', numberOfLayers: 1 },
      { id: 2, mult: '4.0', numberOfLayers: 1 },
      { id: 3, mult: '4.3', numberOfLayers: 2 },
      { id: 4, mult: '4.5', numberOfLayers: 2 },
      { id: 5, mult: '5.0', numberOfLayers: 2 }
    ]).onConflictDoNothing();

    const [provider] = await tx.insert(providers).values({ name: 'Default' }).onConflictDoNothing().returning();
    const providerId = provider?.id || (await tx.select({ id: providers.id }).from(providers).where(sql`${providers.name} = 'Default'`))[0].id;

    // category rules (align with app seed for parity tests)
    await tx.insert(categoryRules).values([
      { category: 'LargeFormat' }
    ]).onConflictDoNothing();

    await tx.insert(priceParams).values({
      inkPrice: '0.55',
      laminationPrice: '1',
      cutPrice: '20',
      cutFactor: '0.25',
      roundingStep: '0.05',
      costMethod: 'latest',
      defaultTier: 1
    }).onConflictDoNothing();

    await tx.insert(products).values([
      // Product used by integration test parity
      { sku: 'SKU-001', name: 'Vinyl Banner 1m²', category: 'LargeFormat', providerId, costSqft: '2.1', areaSqft: '1', activeTier: 1, sellMode: 'SQFT', inkEnabled: true, lamEnabled: false, cutEnabled: false, active: true },
      { sku: 'SKU1', name: 'Producto Demo 1', category: 'banner', providerId, costSqft: '2.5', areaSqft: '1', activeTier: 1, sellMode: 'SQFT', inkEnabled: true, lamEnabled: false, cutEnabled: false, active: true },
      { sku: 'SKU2', name: 'Producto Demo 2', category: 'banner', providerId, costSqft: '3.0', areaSqft: '1', activeTier: 2, sellMode: 'SQFT', inkEnabled: true, lamEnabled: true, cutEnabled: false, active: true },
      { sku: 'SKU3', name: 'Producto Demo 3', category: 'vinyl', providerId, costSqft: '1.8', areaSqft: '1', activeTier: 1, sellMode: 'SQFT', inkEnabled: true, lamEnabled: false, cutEnabled: true, active: true }
    ]).onConflictDoNothing();
  });

  console.log('Seed complete');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
