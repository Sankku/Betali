#!/usr/bin/env node

/**
 * Test Stock Movement with Minimal Fields
 * Try to create a stock movement without the 'notes' field
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
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: {
        status: error.response?.status || 0,
        message: error.message,
        data: error.response?.data || null
      }
    };
  }
}

async function testMinimalStockMovement() {
  console.log('🧪 MINIMAL STOCK MOVEMENT TEST');
  console.log('='.repeat(40));
  
  try {
    // Step 1: Create test business
    const testUser = {
      user_id: uuidv4(),
      email: `minimal-test+${Date.now()}@test.com`,
      name: 'Minimal Test User',
      organization_name: 'Minimal Test Org'
    };
    
    const signupResult = await makeRequest('POST', '/api/auth/complete-signup', testUser);
    if (!signupResult.success) return;
    
    const { organization, tokens } = signupResult.data.data;
    const authHeaders = {
      'Authorization': `Bearer ${tokens.access_token}`,
      'x-organization-id': organization.organization_id
    };
    
    console.log('✅ Business setup complete');
    
    // Step 2: Create product
    const productResult = await makeRequest('POST', '/api/products', {
      name: 'Minimal Test Product',
      batch_number: `MIN-${Date.now()}`,
      expiration_date: '2025-12-31',
      origin_country: 'Argentina',
      price: 25.00
    }, authHeaders);
    
    if (!productResult.success) return;
    const product = productResult.data.data;
    console.log('✅ Product created');
    
    // Step 3: Create warehouse
    const warehouseResult = await makeRequest('POST', '/api/warehouse', {
      name: 'Minimal Test Warehouse',
      location: 'Test Location'
    }, authHeaders);
    
    if (!warehouseResult.success) return;
    const warehouse = warehouseResult.data.data;
    console.log('✅ Warehouse created');
    
    // Step 4: Test different stock movement payloads
    console.log('\n🔧 Testing different stock movement payloads...');
    
    const testCases = [
      {
        name: 'Minimal Required Fields Only',
        payload: {
          product_id: product.product_id,
          warehouse_id: warehouse.warehouse_id,
          movement_type: 'entry',
          quantity: 100
        }
      },
      {
        name: 'With Reference',
        payload: {
          product_id: product.product_id,
          warehouse_id: warehouse.warehouse_id,
          movement_type: 'entry',
          quantity: 100,
          reference: 'Test reference'
        }
      },
      {
        name: 'With Reference and Movement Date',
        payload: {
          product_id: product.product_id,
          warehouse_id: warehouse.warehouse_id,
          movement_type: 'entry',
          quantity: 100,
          reference: 'Test reference',
          movement_date: new Date().toISOString()
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Test: ${testCase.name}`);
      console.log('   Payload:', JSON.stringify(testCase.payload, null, 2));
      
      const result = await makeRequest('POST', '/api/stock-movements', testCase.payload, authHeaders);
      
      if (result.success) {
        console.log('   ✅ SUCCESS!');
        console.log(`   Movement ID: ${result.data?.data?.movement_id}`);
        break; // Stop on first success
      } else {
        console.log('   ❌ FAILED');
        console.log(`   Status: ${result.error.status}`);
        console.log(`   Error: ${result.error.data?.error || result.error.message}`);
        
        // Show detailed error for debugging
        if (result.error.data?.stack) {
          console.log(`   Stack: ${result.error.data.stack.split('\n')[0]}`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Test crashed:', error.message);
  }
}

async function main() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server not running');
    return;
  }
  
  await testMinimalStockMovement();
}

main().catch(console.error);