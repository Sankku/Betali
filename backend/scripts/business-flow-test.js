#!/usr/bin/env node

/**
 * Business Flow Test Suite
 * Simulates real-world restaurant/business scenarios end-to-end
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';

// Simulated business scenarios
const BUSINESS_SCENARIOS = {
  restaurant: {
    name: 'La Cocina Real',
    owner: {
      user_id: uuidv4(),
      email: `owner+${Date.now()}@lacocinareal.com`,
      name: 'Carlos Mendez',
      password: 'Restaurant2025!'
    },
    products: [
      { name: 'Arroz Premium', batch: 'ARROZ001', origin: 'Argentina', price: 25.50 },
      { name: 'Aceite de Oliva', batch: 'ACEITE001', origin: 'España', price: 45.00 },
      { name: 'Pollo Fresco', batch: 'POLLO001', origin: 'Argentina', price: 18.90 }
    ],
    warehouses: [
      { name: 'Almacén Principal', location: 'Cocina Central' },
      { name: 'Despensa Seca', location: 'Planta Baja' }
    ]
  },
  store: {
    name: 'SuperMercado Beta',
    owner: {
      user_id: uuidv4(),
      email: `manager+${Date.now()}@superbeta.com`,
      name: 'Ana Rodriguez',
      password: 'SuperMercado2025!'
    },
    products: [
      { name: 'Leche Entera', batch: 'LECHE001', origin: 'Argentina', price: 12.50 },
      { name: 'Pan Integral', batch: 'PAN001', origin: 'Argentina', price: 8.90 }
    ],
    warehouses: [
      { name: 'Depósito Principal', location: 'Trastienda' }
    ]
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  businessContexts: {}
};

function logResult(testName, success, details = '', data = null) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) console.log(`   📋 ${details}`);
  if (data && typeof data === 'object') {
    console.log(`   📊 Data:`, JSON.stringify(data, null, 2));
  }
  
  results.tests.push({ name: testName, success, details, data });
  if (success) results.passed++;
  else results.failed++;
}

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
      },
      status: error.response?.status || 0
    };
  }
}

async function makeAuthenticatedRequest(method, endpoint, data = null, context, additionalHeaders = {}) {
  const headers = {
    ...additionalHeaders
  };
  
  if (context.authTokens?.access_token) {
    headers['Authorization'] = `Bearer ${context.authTokens.access_token}`;
  }
  
  if (context.organizationId) {
    headers['x-organization-id'] = context.organizationId;
  }
  
  return makeRequest(method, endpoint, data, headers);
}

async function setupBusiness(businessType, businessData) {
  console.log(`\n🏢 Setting up ${businessData.name} (${businessType})...`);
  
  // Step 1: Complete signup
  const signupData = {
    ...businessData.owner,
    organization_name: businessData.name
  };
  
  const signupResult = await makeRequest('POST', '/api/auth/complete-signup', signupData);
  
  if (!signupResult.success) {
    logResult(`${businessType} - Business Setup`, false, 'Signup failed', signupResult.error);
    return null;
  }
  
  const responseData = signupResult.data?.data;
  const tokens = responseData?.tokens;
  
  if (!tokens?.access_token) {
    logResult(`${businessType} - Business Setup`, false, 'No tokens provided');
    return null;
  }
  
  const context = {
    businessType,
    businessName: businessData.name,
    authTokens: tokens,
    organizationId: responseData.organization.organization_id,
    userId: responseData.user.user_id,
    products: [],
    warehouses: []
  };
  
  logResult(`${businessType} - Business Setup`, true, `${businessData.name} created successfully`, {
    organization_id: context.organizationId,
    user_id: context.userId
  });
  
  return context;
}

async function createInventory(context, businessData) {
  console.log(`\n📦 Creating inventory for ${context.businessName}...`);
  
  // Create warehouses
  for (const warehouseData of businessData.warehouses) {
    const warehouseResult = await makeAuthenticatedRequest('POST', '/api/warehouse', warehouseData, context);
    
    if (warehouseResult.success) {
      const warehouse = warehouseResult.data?.data;
      context.warehouses.push(warehouse);
      logResult(`${context.businessType} - Warehouse Creation`, true, `Created warehouse: ${warehouseData.name}`, {
        warehouse_id: warehouse.warehouse_id
      });
    } else {
      logResult(`${context.businessType} - Warehouse Creation`, false, `Failed to create warehouse: ${warehouseData.name}`, warehouseResult.error);
    }
  }
  
  // Create products
  for (const productData of businessData.products) {
    const productPayload = {
      ...productData,
      batch_number: productData.batch,
      origin_country: productData.origin,
      expiration_date: '2025-12-31',
      description: `${productData.name} para ${context.businessName}`
    };
    
    const productResult = await makeAuthenticatedRequest('POST', '/api/products', productPayload, context);
    
    if (productResult.success) {
      const product = productResult.data?.data;
      context.products.push(product);
      logResult(`${context.businessType} - Product Creation`, true, `Created product: ${productData.name}`, {
        product_id: product.product_id,
        price: productData.price
      });
    } else {
      logResult(`${context.businessType} - Product Creation`, false, `Failed to create product: ${productData.name}`, productResult.error);
    }
  }
}

async function simulateStockMovements(context) {
  console.log(`\n📈 Simulating stock movements for ${context.businessName}...`);
  
  // Test getting stock movements first
  const getStockResult = await makeAuthenticatedRequest('GET', '/api/stock-movements', null, context);
  logResult(`${context.businessType} - Get Stock Movements`, getStockResult.success,
    getStockResult.success ? `Found ${getStockResult.data?.data?.length || 0} stock movements` : getStockResult.error?.message);
  
  // Create stock entry for each product in first warehouse
  if (context.products.length > 0 && context.warehouses.length > 0) {
    const warehouse = context.warehouses[0];
    
    for (let i = 0; i < Math.min(2, context.products.length); i++) {
      const product = context.products[i];
      const movementData = {
        product_id: product.product_id,
        warehouse_id: warehouse.warehouse_id,
        movement_type: 'entry',
        quantity: 50 + (i * 25),
        reference: `Initial stock for ${product.name} - ${context.businessName}`
      };
      
      const movementResult = await makeAuthenticatedRequest('POST', '/api/stock-movements', movementData, context);
      logResult(`${context.businessType} - Stock Movement`, movementResult.success,
        movementResult.success ? `Added ${movementData.quantity} units of ${product.name}` : movementResult.error?.message);
    }
  }
}

async function testBusinessAPIs(context) {
  console.log(`\n🔍 Testing business APIs for ${context.businessName}...`);
  
  // Test inventory summary
  const productsResult = await makeAuthenticatedRequest('GET', '/api/products', null, context);
  logResult(`${context.businessType} - Inventory Check`, productsResult.success,
    productsResult.success ? `Found ${productsResult.data?.data?.length || 0} products in inventory` : productsResult.error?.message);
  
  // Test warehouse management
  const warehousesResult = await makeAuthenticatedRequest('GET', '/api/warehouse', null, context);
  logResult(`${context.businessType} - Warehouse Check`, warehousesResult.success,
    warehousesResult.success ? `Managing ${warehousesResult.data?.data?.length || 0} warehouses` : warehousesResult.error?.message);
  
  // Test stock movements summary
  const stockResult = await makeAuthenticatedRequest('GET', '/api/stock-movements', null, context);
  logResult(`${context.businessType} - Stock Movements Check`, stockResult.success,
    stockResult.success ? `Recorded ${stockResult.data?.data?.length || 0} stock movements` : stockResult.error?.message);
}

async function runBusinessFlowTest() {
  console.log('🏢 BUSINESS FLOW TEST SUITE');
  console.log('='.repeat(50));
  console.log(`🎯 Testing against: ${BASE_URL}`);
  console.log(`📊 Simulating real business scenarios...`);
  console.log('');
  
  try {
    // Setup businesses
    for (const [businessType, businessData] of Object.entries(BUSINESS_SCENARIOS)) {
      const context = await setupBusiness(businessType, businessData);
      if (context) {
        results.businessContexts[businessType] = context;
        
        // Create inventory
        await createInventory(context, businessData);
        
        // Simulate operations
        await simulateStockMovements(context);
        
        // Test business APIs
        await testBusinessAPIs(context);
      }
    }
    
  } catch (error) {
    console.error('💥 Business flow test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
  
  // Summary
  console.log('\n📊 BUSINESS FLOW TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.tests.length || 1)) * 100)}%`);
  
  // Business summary
  console.log('\n🏢 BUSINESS SETUP SUMMARY');
  console.log('='.repeat(30));
  for (const [businessType, context] of Object.entries(results.businessContexts)) {
    if (context) {
      console.log(`📊 ${context.businessName} (${businessType}):`);
      console.log(`   👤 User ID: ${context.userId}`);
      console.log(`   🏢 Organization ID: ${context.organizationId}`);
      console.log(`   📦 Products: ${context.products.length}`);
      console.log(`   🏪 Warehouses: ${context.warehouses.length}`);
      console.log(`   🔐 Authentication: ${context.authTokens ? 'WORKING' : 'FAILED'}`);
    }
  }
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('='.repeat(20));
    results.tests
      .filter(t => !t.success)
      .forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name}:`);
        console.log(`   📋 ${test.details}`);
        if (test.data) {
          console.log(`   📊 ${JSON.stringify(test.data, null, 2)}`);
        }
      });
  }
  
  const success = results.failed === 0;
  console.log(`\n${success ? '🎉 ALL BUSINESS FLOWS WORKING!' : '⚠️  SOME BUSINESS FLOWS FAILED'}`);
  console.log(success ? 
    'Your application is ready for real businesses!' : 
    'Some business scenarios need attention before production deployment.'
  );
  
  return success;
}

// Check server availability
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server with: bun run back');
    return false;
  }
}

async function main() {
  console.log('🔍 Checking server status...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  console.log('');
  
  const success = await runBusinessFlowTest();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the business flow test
main().catch(console.error);