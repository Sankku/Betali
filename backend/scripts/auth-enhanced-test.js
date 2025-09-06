#!/usr/bin/env node

/**
 * Authentication-Enhanced Test Suite
 * Tests complete signup flow with JWT token generation and authenticated API calls
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';
const TEST_DATA = {
  user: {
    user_id: uuidv4(),
    email: `auth-test+${Date.now()}@betali.com`,
    name: 'Auth Test User',
    organization_name: 'Auth Test Organization',
    password: 'TestPassword123!'
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  authTokens: null,
  organizationId: null,
  userId: null
};

function logResult(testName, success, details = '', data = null) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) console.log(`   📋 ${details}`);
  if (data && typeof data === 'object') {
    console.log(`   🔍 Data:`, JSON.stringify(data, null, 2));
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

async function makeAuthenticatedRequest(method, endpoint, data = null, additionalHeaders = {}) {
  const headers = {
    ...additionalHeaders
  };
  
  if (results.authTokens?.access_token) {
    headers['Authorization'] = `Bearer ${results.authTokens.access_token}`;
  }
  
  // Add organization context if available
  if (results.organizationId) {
    headers['x-organization-id'] = results.organizationId;
  }
  
  return makeRequest(method, endpoint, data, headers);
}

async function testSignupWithTokenGeneration() {
  console.log('\n🔐 Testing Enhanced Signup with Token Generation...');
  
  const signupResult = await makeRequest('POST', '/api/auth/complete-signup', TEST_DATA.user);
  
  if (!signupResult.success) {
    logResult('Enhanced Signup', false, 'Signup failed completely', signupResult.error);
    return null;
  }
  
  const responseData = signupResult.data?.data;
  const tokens = responseData?.tokens;
  
  if (tokens && tokens.access_token) {
    results.authTokens = tokens;
    results.organizationId = responseData.organization.organization_id;
    results.userId = responseData.user.user_id;
    
    logResult('Enhanced Signup', true, `User created with tokens: ${responseData.user.email}`, {
      user_id: responseData.user.user_id,
      organization_id: responseData.organization.organization_id,
      token_provided: !!tokens.access_token
    });
  } else {
    logResult('Enhanced Signup', false, 'Signup succeeded but no tokens provided', {
      response: responseData,
      tokens: tokens
    });
    return null;
  }
  
  return responseData;
}

async function testLoginEndpoint() {
  console.log('\n🔓 Testing Login Endpoint...');
  
  const loginData = {
    email: TEST_DATA.user.email,
    password: TEST_DATA.user.password
  };
  
  const loginResult = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (loginResult.success) {
    const loginResponse = loginResult.data?.data;
    const session = loginResponse?.session;
    
    if (session && session.access_token) {
      // Update auth tokens with login tokens
      results.authTokens = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type
      };
      
      logResult('Login Endpoint', true, `Login successful for: ${loginResponse.user.email}`, {
        user_id: loginResponse.user.user_id,
        organization_count: loginResponse.organizations?.length || 0,
        token_provided: !!session.access_token
      });
    } else {
      logResult('Login Endpoint', false, 'Login succeeded but no session tokens provided', loginResponse);
    }
  } else {
    logResult('Login Endpoint', false, `Login failed: ${loginResult.error.message}`, loginResult.error);
  }
}

async function testAuthenticatedEndpoints() {
  console.log('\n🔒 Testing Authenticated Endpoints...');
  
  if (!results.authTokens?.access_token) {
    logResult('Authenticated Tests', false, 'No auth tokens available - skipping authenticated tests');
    return;
  }
  
  // Test Products API
  console.log('\n📦 Testing Products API with Authentication...');
  
  const getProductsResult = await makeAuthenticatedRequest('GET', '/api/products');
  logResult('GET /api/products (authenticated)', getProductsResult.success,
    getProductsResult.success ? `Found ${getProductsResult.data?.data?.length || 0} products` : getProductsResult.error?.message,
    getProductsResult.success ? null : getProductsResult.error);
  
  // Test creating a product
  const productData = {
    name: 'Auth Test Product',
    description: 'Product created via authenticated API',
    batch_number: `AUTH-${Date.now()}`,
    expiration_date: '2025-12-31',
    origin_country: 'Argentina',
    price: 149.99
  };
  
  const createProductResult = await makeAuthenticatedRequest('POST', '/api/products', productData);
  logResult('POST /api/products (authenticated)', createProductResult.success,
    createProductResult.success ? `Created product: ${createProductResult.data?.data?.name}` : createProductResult.error?.message,
    createProductResult.success ? { product_id: createProductResult.data?.data?.product_id } : createProductResult.error);
  
  // Test Warehouses API
  console.log('\n🏬 Testing Warehouses API with Authentication...');
  
  const getWarehousesResult = await makeAuthenticatedRequest('GET', '/api/warehouse');
  logResult('GET /api/warehouse (authenticated)', getWarehousesResult.success,
    getWarehousesResult.success ? `Found ${getWarehousesResult.data?.data?.length || 0} warehouses` : getWarehousesResult.error?.message,
    getWarehousesResult.success ? null : getWarehousesResult.error);
  
  // Test creating a warehouse
  const warehouseData = {
    name: 'Auth Test Warehouse',
    location: 'Test Location via Auth API'
  };
  
  const createWarehouseResult = await makeAuthenticatedRequest('POST', '/api/warehouse', warehouseData);
  logResult('POST /api/warehouse (authenticated)', createWarehouseResult.success,
    createWarehouseResult.success ? `Created warehouse: ${createWarehouseResult.data?.data?.name}` : createWarehouseResult.error?.message,
    createWarehouseResult.success ? { warehouse_id: createWarehouseResult.data?.data?.warehouse_id } : createWarehouseResult.error);
  
  // Test Organization APIs
  console.log('\n🏢 Testing Organization APIs with Authentication...');
  
  const userOrgsResult = await makeAuthenticatedRequest('GET', `/api/users/${results.userId}/organizations`);
  logResult('GET /api/users/{id}/organizations (authenticated)', userOrgsResult.success,
    userOrgsResult.success ? `Found ${userOrgsResult.data?.data?.length || 0} user organizations` : userOrgsResult.error?.message,
    userOrgsResult.success ? null : userOrgsResult.error);
}

async function runAuthEnhancedTest() {
  console.log('🔐 AUTHENTICATION-ENHANCED TEST SUITE');
  console.log('='.repeat(50));
  console.log(`🎯 Testing against: ${BASE_URL}`);
  console.log(`👤 Test user: ${TEST_DATA.user.email}`);
  console.log(`🔑 User ID: ${TEST_DATA.user.user_id}`);
  console.log('');
  
  try {
    // 1. Test enhanced signup with token generation
    const signupData = await testSignupWithTokenGeneration();
    if (!signupData) {
      console.log('❌ Cannot continue - enhanced signup failed');
      return false;
    }
    
    console.log(`\n🎯 Authentication Context:`);
    console.log(`   🎫 Access Token: ${results.authTokens?.access_token ? 'PROVIDED' : 'MISSING'}`);
    console.log(`   🔄 Refresh Token: ${results.authTokens?.refresh_token ? 'PROVIDED' : 'MISSING'}`);
    console.log(`   👤 User ID: ${signupData.user.user_id}`);
    console.log(`   🏢 Organization ID: ${signupData.organization.organization_id}`);
    
    // 2. Test login endpoint
    await testLoginEndpoint();
    
    // 3. Test authenticated API endpoints
    await testAuthenticatedEndpoints();
    
  } catch (error) {
    console.error('💥 Auth-enhanced test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
  
  // Summary
  console.log('\n📊 AUTHENTICATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.tests.length || 1)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS SUMMARY:');
    console.log('='.repeat(30));
    results.tests
      .filter(t => !t.success)
      .forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name}:`);
        console.log(`   📋 ${test.details}`);
        if (test.data) {
          console.log(`   🔍 ${JSON.stringify(test.data, null, 2)}`);
        }
      });
  }
  
  const success = results.failed === 0;
  console.log(`\n${success ? '🎉 ALL AUTHENTICATION TESTS PASSED!' : '⚠️  AUTHENTICATION ISSUES DETECTED'}`);
  console.log(success ? 'Authentication system is working correctly!' : 'Critical authentication issues need to be resolved.');
  
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
  
  const success = await runAuthEnhancedTest();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the auth-enhanced test
main().catch(console.error);