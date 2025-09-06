#!/usr/bin/env node

/**
 * Enhanced Smoke Test for Betali Platform
 * Provides detailed error reporting and comprehensive API testing
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';
const TEST_DATA = {
  user: {
    user_id: uuidv4(),
    email: `enhanced-test+${Date.now()}@betali.com`,
    name: 'Enhanced Test User',
    organization_name: 'Enhanced Test Organization'
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  errors: []
};

function logResult(testName, success, details = '', error = null) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) console.log(`   📋 ${details}`);
  if (error && typeof error === 'object') {
    console.log(`   🐛 Error Details:`, JSON.stringify(error, null, 2));
  } else if (error) {
    console.log(`   🐛 Error: ${error}`);
  }
  
  results.tests.push({ name: testName, success, details, error });
  if (success) results.passed++;
  else {
    results.failed++;
    results.errors.push({ test: testName, error: error || details });
  }
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
    
    console.log(`📤 ${method.toUpperCase()} ${endpoint}`, data ? `\n   Data: ${JSON.stringify(data, null, 2)}` : '');
    
    const response = await axios(config);
    console.log(`📥 Response [${response.status}]:`, JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const errorData = {
      status: error.response?.status || 0,
      statusText: error.response?.statusText || 'Unknown',
      message: error.message,
      data: error.response?.data || null,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        data: error.config?.data
      }
    };
    
    console.log(`📥 Error Response [${errorData.status}]:`, JSON.stringify(errorData, null, 2));
    
    return {
      success: false,
      error: errorData,
      status: errorData.status
    };
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  const result = await makeRequest('GET', '/health');
  logResult('Health Check', result.success, 
    result.success ? `Status: ${result.status}` : 'Health endpoint failed', 
    result.error);
  return result;
}

async function testAuthEndpoints() {
  console.log('\n🔐 Testing Auth Endpoints...');
  
  // Test signup
  const signupResult = await makeRequest('POST', '/api/auth/complete-signup', TEST_DATA.user);
  logResult('Complete Signup', signupResult.success, 
    signupResult.success ? `User created: ${signupResult.data?.data?.user?.email}` : 'Signup failed',
    signupResult.error);
  
  if (!signupResult.success) return null;
  
  // Test login (if endpoint exists)
  const loginData = {
    email: TEST_DATA.user.email,
    password: 'test_password'
  };
  const loginResult = await makeRequest('POST', '/api/auth/login', loginData);
  logResult('Login Attempt', loginResult.success, 
    loginResult.success ? 'Login successful' : 'Login failed (expected if not implemented)',
    loginResult.error);
  
  return signupResult.data?.data;
}

async function testCoreAPIs(organizationId, authHeaders = {}) {
  console.log('\n🔧 Testing Core APIs...');
  
  // Products API
  console.log('\n📦 Testing Products API...');
  
  const getProductsResult = await makeRequest('GET', '/api/products', null, authHeaders);
  logResult('GET /api/products', getProductsResult.success, 
    getProductsResult.success ? `Found ${getProductsResult.data?.data?.length || 0} products` : 'Failed to get products',
    getProductsResult.error);
  
  const productData = {
    name: 'Enhanced Test Product',
    description: 'Product created by enhanced smoke test',
    batch_number: `ENHANCED-${Date.now()}`,
    expiration_date: '2025-12-31',
    origin_country: 'Argentina',
    price: 99.99,
    organization_id: organizationId
  };
  
  const createProductResult = await makeRequest('POST', '/api/products', productData, authHeaders);
  logResult('POST /api/products', createProductResult.success,
    createProductResult.success ? `Created product: ${createProductResult.data?.data?.name}` : 'Failed to create product',
    createProductResult.error);
  
  // Warehouse API
  console.log('\n🏬 Testing Warehouse API...');
  
  const getWarehousesResult = await makeRequest('GET', '/api/warehouse', null, authHeaders);
  logResult('GET /api/warehouse', getWarehousesResult.success,
    getWarehousesResult.success ? `Found ${getWarehousesResult.data?.data?.length || 0} warehouses` : 'Failed to get warehouses',
    getWarehousesResult.error);
  
  const warehouseData = {
    name: 'Enhanced Test Warehouse',
    location: 'Enhanced Test Location',
    organization_id: organizationId
  };
  
  const createWarehouseResult = await makeRequest('POST', '/api/warehouse', warehouseData, authHeaders);
  logResult('POST /api/warehouse', createWarehouseResult.success,
    createWarehouseResult.success ? `Created warehouse: ${createWarehouseResult.data?.data?.name}` : 'Failed to create warehouse',
    createWarehouseResult.error);
  
  // Stock Movements API
  console.log('\n📊 Testing Stock Movements API...');
  
  const getStockMovementsResult = await makeRequest('GET', '/api/stock-movements', null, authHeaders);
  logResult('GET /api/stock-movements', getStockMovementsResult.success,
    getStockMovementsResult.success ? `Found ${getStockMovementsResult.data?.data?.length || 0} movements` : 'Failed to get stock movements',
    getStockMovementsResult.error);
  
  return {
    product: createProductResult.data?.data,
    warehouse: createWarehouseResult.data?.data
  };
}

async function testOrganizationAPIs(userId, organizationId, authHeaders = {}) {
  console.log('\n🏢 Testing Organization APIs...');
  
  if (userId) {
    const userOrgsResult = await makeRequest('GET', `/api/users/${userId}/organizations`, null, authHeaders);
    logResult('GET /api/users/{id}/organizations', userOrgsResult.success,
      userOrgsResult.success ? `Found ${userOrgsResult.data?.data?.length || 0} user organizations` : 'Failed to get user organizations',
      userOrgsResult.error);
  }
  
  if (organizationId) {
    const orgDetailsResult = await makeRequest('GET', `/api/organizations/${organizationId}`, null, authHeaders);
    logResult('GET /api/organizations/{id}', orgDetailsResult.success,
      orgDetailsResult.success ? `Organization: ${orgDetailsResult.data?.data?.name}` : 'Failed to get organization details',
      orgDetailsResult.error);
  }
}

async function testPricingAPIs(organizationId, authHeaders = {}) {
  console.log('\n💰 Testing Pricing APIs...');
  
  // Tax rates
  const taxRateData = {
    name: 'Enhanced Test Tax Rate',
    description: 'Tax rate for enhanced smoke test',
    rate: 0.21,
    organization_id: organizationId
  };
  
  const taxResult = await makeRequest('POST', '/api/tax-rates', taxRateData, authHeaders);
  logResult('POST /api/tax-rates', taxResult.success,
    taxResult.success ? `Created tax rate: ${taxResult.data?.data?.name}` : 'Failed to create tax rate',
    taxResult.error);
  
  // Discount rules
  const discountData = {
    name: 'Enhanced Test Discount',
    description: 'Discount for enhanced smoke test',
    type: 'percentage',
    value: 0.10,
    organization_id: organizationId
  };
  
  const discountResult = await makeRequest('POST', '/api/discount-rules', discountData, authHeaders);
  logResult('POST /api/discount-rules', discountResult.success,
    discountResult.success ? `Created discount: ${discountResult.data?.data?.name}` : 'Failed to create discount rule',
    discountResult.error);
}

async function runEnhancedTest() {
  console.log('🧪 ENHANCED SMOKE TEST');
  console.log('='.repeat(50));
  console.log(`🎯 Testing against: ${BASE_URL}`);
  console.log(`👤 Test user: ${TEST_DATA.user.email}`);
  console.log(`🆔 Test user ID: ${TEST_DATA.user.user_id}`);
  console.log('');
  
  try {
    // 1. Health check
    const healthResult = await testHealthEndpoint();
    if (!healthResult.success) {
      console.log('❌ Cannot continue - health check failed');
      return false;
    }
    
    // 2. Authentication flow
    const authData = await testAuthEndpoints();
    if (!authData) {
      console.log('❌ Cannot continue - authentication failed');
      return false;
    }
    
    const { user, organization } = authData;
    const authHeaders = {}; // TODO: Add JWT token when auth is implemented
    
    console.log(`\n🎯 Test Context:`);
    console.log(`   👤 User ID: ${user?.user_id}`);
    console.log(`   🏢 Organization ID: ${organization?.organization_id}`);
    console.log(`   📧 Email: ${user?.email}`);
    console.log(`   🏢 Org Name: ${organization?.name}`);
    
    // 3. Core APIs
    const apiResults = await testCoreAPIs(organization?.organization_id, authHeaders);
    
    // 4. Organization management
    await testOrganizationAPIs(user?.user_id, organization?.organization_id, authHeaders);
    
    // 5. Pricing system
    await testPricingAPIs(organization?.organization_id, authHeaders);
    
  } catch (error) {
    console.error('💥 Enhanced test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
  
  // Summary
  console.log('\n📊 ENHANCED SMOKE TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.tests.length || 1)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ DETAILED ERROR ANALYSIS:');
    console.log('='.repeat(30));
    results.errors.forEach((err, index) => {
      console.log(`\n${index + 1}. ${err.test}:`);
      console.log(`   🐛 ${JSON.stringify(err.error, null, 2)}`);
    });
  }
  
  const success = results.failed === 0;
  console.log(`\n${success ? '🎉 ALL TESTS PASSED!' : '⚠️  TESTS FAILED'}`);
  console.log(success ? 'System is ready for production!' : 'Critical issues detected - see detailed analysis above.');
  
  return success;
}

// Check server availability
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running');
    console.log(`📊 Server info:`, JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server with: bun run back');
    console.error('Error details:', error.message);
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
  
  const success = await runEnhancedTest();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the enhanced test
main().catch(console.error);