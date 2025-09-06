#!/usr/bin/env node

/**
 * Debug Stock Movements Test
 * Diagnoses exactly what's failing in stock movement creation
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      },
      timeout: 15000
    };
    
    if (data) config.data = data;
    
    console.log(`📤 ${method.toUpperCase()} ${endpoint}`);
    if (data) console.log(`   Data:`, JSON.stringify(data, null, 2));
    if (headers.Authorization) console.log(`   Auth: Bearer token present`);
    if (headers['x-organization-id']) console.log(`   Org: ${headers['x-organization-id']}`);
    
    const response = await axios(config);
    console.log(`📥 Response [${response.status}]:`, JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const errorData = {
      status: error.response?.status || 0,
      statusText: error.response?.statusText || 'Unknown',
      message: error.message,
      data: error.response?.data || null
    };
    
    console.log(`📥 Error [${errorData.status}]:`, JSON.stringify(errorData, null, 2));
    
    return {
      success: false,
      error: errorData,
      status: errorData.status
    };
  }
}

async function debugStockMovements() {
  console.log('🔍 STOCK MOVEMENTS DEBUG TEST');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Create a test business
    console.log('\n🏢 Step 1: Creating test business...');
    const testUser = {
      user_id: uuidv4(),
      email: `debug-stock+${Date.now()}@test.com`,
      name: 'Debug Stock User',
      organization_name: 'Debug Stock Org'
    };
    
    const signupResult = await makeRequest('POST', '/api/auth/complete-signup', testUser);
    if (!signupResult.success) {
      console.log('❌ Cannot continue - signup failed');
      return;
    }
    
    const { user, organization, tokens } = signupResult.data.data;
    const authHeaders = {
      'Authorization': `Bearer ${tokens.access_token}`,
      'x-organization-id': organization.organization_id
    };
    
    console.log(`✅ Business created: ${organization.name} (${organization.organization_id})`);
    
    // Step 2: Create a product
    console.log('\n📦 Step 2: Creating test product...');
    const productData = {
      name: 'Debug Test Product',
      batch_number: `DEBUG-${Date.now()}`,
      expiration_date: '2025-12-31',
      origin_country: 'Argentina',
      price: 50.00,
      description: 'Product for debugging stock movements'
    };
    
    const productResult = await makeRequest('POST', '/api/products', productData, authHeaders);
    if (!productResult.success) {
      console.log('❌ Cannot continue - product creation failed');
      return;
    }
    
    const product = productResult.data.data;
    console.log(`✅ Product created: ${product.name} (${product.product_id})`);
    
    // Step 3: Create a warehouse
    console.log('\n🏪 Step 3: Creating test warehouse...');
    const warehouseData = {
      name: 'Debug Test Warehouse',
      location: 'Debug Location'
    };
    
    const warehouseResult = await makeRequest('POST', '/api/warehouse', warehouseData, authHeaders);
    if (!warehouseResult.success) {
      console.log('❌ Cannot continue - warehouse creation failed');
      return;
    }
    
    const warehouse = warehouseResult.data.data;
    console.log(`✅ Warehouse created: ${warehouse.name} (${warehouse.warehouse_id})`);
    
    // Step 4: Verify GET stock movements works
    console.log('\n📊 Step 4: Testing GET stock movements...');
    const getStockResult = await makeRequest('GET', '/api/stock-movements', null, authHeaders);
    if (!getStockResult.success) {
      console.log('❌ GET stock movements failed');
      return;
    }
    console.log(`✅ GET stock movements working: Found ${getStockResult.data.data?.length || 0} movements`);
    
    // Step 5: Attempt to create stock movement
    console.log('\n📈 Step 5: Creating stock movement...');
    console.log('🔍 Using the following data:');
    console.log(`   Product ID: ${product.product_id}`);
    console.log(`   Warehouse ID: ${warehouse.warehouse_id}`);
    console.log(`   Organization ID: ${organization.organization_id}`);
    
    const movementData = {
      product_id: product.product_id,
      warehouse_id: warehouse.warehouse_id,
      movement_type: 'entry',
      quantity: 100,
      reference: 'Debug test entry',
      notes: 'Stock movement created for debugging purposes'
    };
    
    const movementResult = await makeRequest('POST', '/api/stock-movements', movementData, authHeaders);
    if (!movementResult.success) {
      console.log('❌ Stock movement creation failed');
      console.log('\n🔍 ERROR ANALYSIS:');
      console.log('Status:', movementResult.error.status);
      console.log('Message:', movementResult.error.message);
      console.log('Error Data:', JSON.stringify(movementResult.error.data, null, 2));
      return;
    }
    
    const movement = movementResult.data.data;
    console.log(`✅ Stock movement created successfully: ${movement.movement_id}`);
    
    // Step 6: Verify the movement was created
    console.log('\n✅ Step 6: Verifying movement was stored...');
    const verifyResult = await makeRequest('GET', '/api/stock-movements', null, authHeaders);
    if (verifyResult.success) {
      const movements = verifyResult.data.data;
      console.log(`✅ Verification successful: Found ${movements.length} movements`);
      if (movements.length > 0) {
        const latestMovement = movements[0];
        console.log('Latest movement:', {
          id: latestMovement.movement_id,
          type: latestMovement.movement_type,
          quantity: latestMovement.quantity,
          product_name: latestMovement.product_name || 'N/A',
          warehouse_name: latestMovement.warehouse_name || 'N/A'
        });
      }
    }
    
    console.log('\n🎉 Stock movements debugging completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Debug test crashed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function main() {
  console.log('🔍 Checking server status...');
  
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    process.exit(1);
  }
  
  await debugStockMovements();
}

main().catch(console.error);