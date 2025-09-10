#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

// Test the server action directly
import('../../src/server/actions/productMutations.js').then(async (module) => {
  const { createProduct } = module;
  
  const testProduct = {
    sku: 'NEW-001', // This should be auto-generated
    name: 'Test Auto Product',
    category: 'Test',
    providerId: 'test-provider-id', // This will fail but we'll see the SKU logic
    cost_sqft: 2.5,
    area_sqft: 1,
    active_tier: 1,
    ink_enabled: true,
    lam_enabled: false,
    cut_enabled: false,
    active: true
  };

  try {
    console.log('Testing server action SKU generation...');
    const result = await createProduct(testProduct);
    console.log('✅ Created product with SKU:', result.sku);
  } catch (error) {
    console.log('Expected error (provider not found):', error.message);
    console.log('But we should see the SKU generation in the error trace');
  }
}).catch(console.error);
