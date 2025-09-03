#!/usr/bin/env node

/**
 * Comprehensive Smoke Test for Betali Platform
 * Tests all critical endpoints and functionality
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';
const TEST_DATA = {
  user: {
    user_id: uuidv4(),
    email: `smoke-test+${Date.now()}@betali.com`,
    name: 'Smoke Test User',
    organization_name: 'Smoke Test Organization'
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logResult(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name: testName, success, details });
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
      timeout: 10000
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 0
    };
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  const result = await makeRequest('GET', '/health');
  logResult('Health Check', result.success, result.success ? `Status: ${result.status}` : result.error);
  return result;
}

async function testSignupFlow() {
  console.log('\n👤 Testing Signup Flow...');
  
  // Test signup
  const signupResult = await makeRequest('POST', '/api/auth/complete-signup', TEST_DATA.user);
  logResult('User Signup', signupResult.success, 
    signupResult.success ? `Created user: ${signupResult.data.data.user.email}` : signupResult.error);
  
  if (!signupResult.success) return null;
  
  return signupResult.data.data;
}

async function testProductsAPI(organizationId, authHeaders = {}) {
  console.log('\n📦 Testing Products API...');
  
  // Test get products
  const getResult = await makeRequest('GET', '/api/products', null, authHeaders);
  logResult('Get Products', getResult.success, 
    getResult.success ? `Found ${getResult.data.data?.length || 0} products` : getResult.error);
  
  // Test create product
  const productData = {
    name: 'Smoke Test Product',
    description: 'Product created by smoke test',
    batch_number: `BATCH-${Date.now()}`,
    expiration_date: '2025-12-31',
    origin_country: 'Argentina',
    price: 99.99,
    organization_id: organizationId
  };
  
  const createResult = await makeRequest('POST', '/api/products', productData, authHeaders);
  logResult('Create Product', createResult.success, 
    createResult.success ? `Created product: ${createResult.data.data?.name}` : createResult.error);
  
  return createResult.success ? createResult.data.data : null;
}

async function testWarehouseAPI(organizationId, authHeaders = {}) {
  console.log('\n🏬 Testing Warehouse API...');
  
  // Test get warehouses
  const getResult = await makeRequest('GET', '/api/warehouse', null, authHeaders);
  logResult('Get Warehouses', getResult.success, 
    getResult.success ? `Found ${getResult.data.data?.length || 0} warehouses` : getResult.error);
  
  // Test create warehouse
  const warehouseData = {
    name: 'Smoke Test Warehouse',
    location: 'Test Location',
    organization_id: organizationId
  };
  
  const createResult = await makeRequest('POST', '/api/warehouse', warehouseData, authHeaders);
  logResult('Create Warehouse', createResult.success, 
    createResult.success ? `Created warehouse: ${createResult.data.data?.name}` : createResult.error);
  
  return createResult.success ? createResult.data.data : null;
}

async function testStockMovementsAPI(productId, warehouseId, organizationId, authHeaders = {}) {
  console.log('\n📊 Testing Stock Movements API...');
  
  if (!productId || !warehouseId) {
    logResult('Stock Movement Test', false, 'Skipped - missing product or warehouse');
    return;
  }
  
  // Test get stock movements
  const getResult = await makeRequest('GET', '/api/stock-movements', null, authHeaders);
  logResult('Get Stock Movements', getResult.success, 
    getResult.success ? `Found ${getResult.data.data?.length || 0} movements` : getResult.error);
  
  // Test create stock movement
  const movementData = {
    product_id: productId,
    warehouse_id: warehouseId,
    movement_type: 'entry',
    quantity: 100,
    reference: 'Smoke test entry',
    organization_id: organizationId
  };
  
  const createResult = await makeRequest('POST', '/api/stock-movements', movementData, authHeaders);
  logResult('Create Stock Movement', createResult.success, 
    createResult.success ? `Created movement: ${createResult.data.data?.movement_type}` : createResult.error);
}

async function testPricingSystem(organizationId, authHeaders = {}) {
  console.log('\n💰 Testing Pricing System...');
  
  // Test tax rates
  const taxRateData = {
    name: 'Test Tax Rate',
    description: 'Tax rate for smoke test',
    rate: 0.21,
    organization_id: organizationId
  };
  
  const taxResult = await makeRequest('POST', '/api/tax-rates', taxRateData, authHeaders);
  logResult('Create Tax Rate', taxResult.success, 
    taxResult.success ? `Created tax rate: ${taxResult.data.data?.name}` : taxResult.error);
  
  // Test discount rules
  const discountData = {
    name: 'Test Discount',
    description: 'Discount for smoke test',
    type: 'percentage',
    value: 0.10,
    organization_id: organizationId
  };
  
  const discountResult = await makeRequest('POST', '/api/discount-rules', discountData, authHeaders);
  logResult('Create Discount Rule', discountResult.success, 
    discountResult.success ? `Created discount: ${discountResult.data.data?.name}` : discountResult.error);
}

async function testOrganizationAPI(userId, organizationId, authHeaders = {}) {
  console.log('\n🏢 Testing Organization API...');
  
  // Test get user organizations
  const orgResult = await makeRequest('GET', `/api/users/${userId}/organizations`, null, authHeaders);
  logResult('Get User Organizations', orgResult.success, 
    orgResult.success ? `Found ${orgResult.data.data?.length || 0} organizations` : orgResult.error);
  
  // Test get organization details
  const detailResult = await makeRequest('GET', `/api/organizations/${organizationId}`, null, authHeaders);
  logResult('Get Organization Details', detailResult.success, 
    detailResult.success ? `Organization: ${detailResult.data.data?.name}` : detailResult.error);
}

async function runComprehensiveTest() {
  console.log('🧪 COMPREHENSIVE SMOKE TEST');
  console.log('============================');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test user: ${TEST_DATA.user.email}`);
  console.log('');
  
  try {
    // 1. Health check
    await testHealthEndpoint();
    
    // 2. Signup flow
    const signupData = await testSignupFlow();
    if (!signupData) {
      console.log('❌ Cannot continue - signup failed');
      return;
    }
    
    const { user, organization } = signupData;
    const authHeaders = {}; // Add auth headers when auth is implemented
    
    // 3. Core APIs
    const product = await testProductsAPI(organization.organization_id, authHeaders);
    const warehouse = await testWarehouseAPI(organization.organization_id, authHeaders);
    
    // 4. Stock movements (requires product + warehouse)
    await testStockMovementsAPI(
      product?.product_id, 
      warehouse?.warehouse_id, 
      organization.organization_id, 
      authHeaders
    );
    
    // 5. Pricing system
    await testPricingSystem(organization.organization_id, authHeaders);
    
    // 6. Organization management
    await testOrganizationAPI(user.user_id, organization.organization_id, authHeaders);
    
  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
  }
  
  // Summary
  console.log('\n📊 SMOKE TEST SUMMARY');
  console.log('======================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => !t.success)
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }
  
  const success = results.failed === 0;
  console.log(`\n${success ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  console.log(success ? 'System is ready for production!' : 'Please fix failing tests before deploying.');
  
  return success;
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
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
  
  console.log('✅ Server is running\n');
  
  const success = await runComprehensiveTest();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the comprehensive test
main().catch(console.error);