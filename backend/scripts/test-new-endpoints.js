#!/usr/bin/env node

/**
 * New Endpoints Test Suite
 * Tests tax-rates and discount-rules endpoints
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  context: null
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
  
  if (context?.authTokens?.access_token) {
    headers['Authorization'] = `Bearer ${context.authTokens.access_token}`;
  }
  
  if (context?.organizationId) {
    headers['x-organization-id'] = context.organizationId;
  }
  
  return makeRequest(method, endpoint, data, headers);
}

async function setupTestBusiness() {
  console.log('\n🏢 Setting up test business...');
  
  const testUser = {
    user_id: uuidv4(),
    email: `endpoints-test+${Date.now()}@test.com`,
    name: 'Endpoints Test User',
    organization_name: 'Endpoints Test Organization',
    password: 'TestPass2025!'
  };
  
  const signupResult = await makeRequest('POST', '/api/auth/complete-signup', testUser);
  
  if (!signupResult.success) {
    logResult('Business Setup', false, 'Signup failed', signupResult.error);
    return null;
  }
  
  const responseData = signupResult.data?.data;
  const tokens = responseData?.tokens;
  
  if (!tokens?.access_token) {
    logResult('Business Setup', false, 'No tokens provided');
    return null;
  }
  
  const context = {
    businessName: testUser.organization_name,
    authTokens: tokens,
    organizationId: responseData.organization.organization_id,
    userId: responseData.user.user_id
  };
  
  logResult('Business Setup', true, `${testUser.organization_name} created successfully`, {
    organization_id: context.organizationId,
    user_id: context.userId
  });
  
  return context;
}

async function testTaxRatesEndpoints(context) {
  console.log('\n💰 Testing Tax Rates Endpoints...');
  
  // Test 1: GET /api/tax-rates (empty list initially)
  const getTaxRatesResult = await makeAuthenticatedRequest('GET', '/api/tax-rates', null, context);
  logResult('GET Tax Rates (Empty)', getTaxRatesResult.success && Array.isArray(getTaxRatesResult.data.data),
    getTaxRatesResult.success ? `Found ${getTaxRatesResult.data.data.length} tax rates` : getTaxRatesResult.error?.message);
  
  // Test 2: GET /api/tax-rates/active (empty list initially)
  const getActiveTaxRatesResult = await makeAuthenticatedRequest('GET', '/api/tax-rates/active', null, context);
  logResult('GET Active Tax Rates (Empty)', getActiveTaxRatesResult.success && Array.isArray(getActiveTaxRatesResult.data.data),
    getActiveTaxRatesResult.success ? `Found ${getActiveTaxRatesResult.data.data.length} active tax rates` : getActiveTaxRatesResult.error?.message);
  
  // Test 3: GET /api/tax-rates/default (should return 404)
  const getDefaultTaxRateResult = await makeAuthenticatedRequest('GET', '/api/tax-rates/default', null, context);
  logResult('GET Default Tax Rate (Not Found)', getDefaultTaxRateResult.status === 404,
    getDefaultTaxRateResult.status === 404 ? 'No default tax rate found (expected)' : `Status: ${getDefaultTaxRateResult.status}`);
  
  // Test 4: POST /api/tax-rates (create tax rate)
  const taxRateData = {
    name: 'Test Tax Rate',
    rate: 0.21,
    description: 'Test tax rate for endpoints testing',
    is_active: true
  };
  
  const createTaxRateResult = await makeAuthenticatedRequest('POST', '/api/tax-rates', taxRateData, context);
  logResult('POST Tax Rate (Create)', createTaxRateResult.success,
    createTaxRateResult.success ? `Created tax rate: ${createTaxRateResult.data.data.name}` : createTaxRateResult.error?.message);
  
  let taxRateId = null;
  if (createTaxRateResult.success) {
    taxRateId = createTaxRateResult.data.data.tax_rate_id;
    
    // Test 5: GET /api/tax-rates/:id (get created tax rate)
    const getTaxRateByIdResult = await makeAuthenticatedRequest('GET', `/api/tax-rates/${taxRateId}`, null, context);
    logResult('GET Tax Rate by ID', getTaxRateByIdResult.success,
      getTaxRateByIdResult.success ? `Retrieved tax rate: ${getTaxRateByIdResult.data.data.name}` : getTaxRateByIdResult.error?.message);
    
    // Test 6: PUT /api/tax-rates/:id (update tax rate)
    const updateData = {
      description: 'Updated test tax rate description',
      rate: 0.22
    };
    
    const updateTaxRateResult = await makeAuthenticatedRequest('PUT', `/api/tax-rates/${taxRateId}`, updateData, context);
    logResult('PUT Tax Rate (Update)', updateTaxRateResult.success,
      updateTaxRateResult.success ? `Updated tax rate rate to ${updateTaxRateResult.data.data.rate}` : updateTaxRateResult.error?.message);
    
    // Test 7: GET /api/tax-rates (should now have 1 item)
    const getTaxRatesAfterCreateResult = await makeAuthenticatedRequest('GET', '/api/tax-rates', null, context);
    logResult('GET Tax Rates (After Create)', getTaxRatesAfterCreateResult.success && getTaxRatesAfterCreateResult.data.data.length === 1,
      getTaxRatesAfterCreateResult.success ? `Found ${getTaxRatesAfterCreateResult.data.data.length} tax rates` : getTaxRatesAfterCreateResult.error?.message);
  }
  
  return taxRateId;
}

async function testDiscountRulesEndpoints(context) {
  console.log('\n🎯 Testing Discount Rules Endpoints...');
  
  // Test 1: GET /api/discount-rules (empty list initially)
  const getDiscountRulesResult = await makeAuthenticatedRequest('GET', '/api/discount-rules', null, context);
  logResult('GET Discount Rules (Empty)', getDiscountRulesResult.success && Array.isArray(getDiscountRulesResult.data.data),
    getDiscountRulesResult.success ? `Found ${getDiscountRulesResult.data.data.length} discount rules` : getDiscountRulesResult.error?.message);
  
  // Test 2: GET /api/discount-rules/active (empty list initially)
  const getActiveDiscountRulesResult = await makeAuthenticatedRequest('GET', '/api/discount-rules/active', null, context);
  logResult('GET Active Discount Rules (Empty)', getActiveDiscountRulesResult.success && Array.isArray(getActiveDiscountRulesResult.data.data),
    getActiveDiscountRulesResult.success ? `Found ${getActiveDiscountRulesResult.data.data.length} active discount rules` : getActiveDiscountRulesResult.error?.message);
  
  // Test 3: GET /api/discount-rules/stats (should return stats structure)
  const getDiscountStatsResult = await makeAuthenticatedRequest('GET', '/api/discount-rules/stats', null, context);
  logResult('GET Discount Stats', getDiscountStatsResult.success && typeof getDiscountStatsResult.data.data === 'object',
    getDiscountStatsResult.success ? `Total rules: ${getDiscountStatsResult.data.data.total_rules}` : getDiscountStatsResult.error?.message);
  
  // Test 4: POST /api/discount-rules (create discount rule)
  const discountRuleData = {
    name: 'Test Percentage Discount',
    type: 'percentage',
    value: 0.15,
    description: 'Test 15% discount for endpoints testing',
    coupon_code: `TEST${Date.now()}`,
    min_order_amount: 50.00,
    is_active: true
  };
  
  const createDiscountRuleResult = await makeAuthenticatedRequest('POST', '/api/discount-rules', discountRuleData, context);
  logResult('POST Discount Rule (Create)', createDiscountRuleResult.success,
    createDiscountRuleResult.success ? `Created discount rule: ${createDiscountRuleResult.data.data.name}` : createDiscountRuleResult.error?.message);
  
  let discountRuleId = null;
  let couponCode = null;
  if (createDiscountRuleResult.success) {
    discountRuleId = createDiscountRuleResult.data.data.discount_rule_id;
    couponCode = createDiscountRuleResult.data.data.coupon_code;
    
    // Test 5: GET /api/discount-rules/:id (get created discount rule)
    const getDiscountRuleByIdResult = await makeAuthenticatedRequest('GET', `/api/discount-rules/${discountRuleId}`, null, context);
    logResult('GET Discount Rule by ID', getDiscountRuleByIdResult.success,
      getDiscountRuleByIdResult.success ? `Retrieved discount rule: ${getDiscountRuleByIdResult.data.data.name}` : getDiscountRuleByIdResult.error?.message);
    
    // Test 6: POST /api/discount-rules/validate-coupon (validate coupon)
    const validateCouponResult = await makeAuthenticatedRequest('POST', '/api/discount-rules/validate-coupon', 
      { coupon_code: couponCode }, context);
    logResult('POST Validate Coupon', validateCouponResult.success,
      validateCouponResult.success ? `Coupon ${couponCode} is valid` : validateCouponResult.error?.message);
    
    // Test 7: PUT /api/discount-rules/:id (update discount rule)
    const updateData = {
      description: 'Updated test discount rule description',
      value: 0.20
    };
    
    const updateDiscountRuleResult = await makeAuthenticatedRequest('PUT', `/api/discount-rules/${discountRuleId}`, updateData, context);
    logResult('PUT Discount Rule (Update)', updateDiscountRuleResult.success,
      updateDiscountRuleResult.success ? `Updated discount rule value to ${updateDiscountRuleResult.data.data.value}` : updateDiscountRuleResult.error?.message);
    
    // Test 8: GET /api/discount-rules (should now have 1 item)
    const getDiscountRulesAfterCreateResult = await makeAuthenticatedRequest('GET', '/api/discount-rules', null, context);
    logResult('GET Discount Rules (After Create)', getDiscountRulesAfterCreateResult.success && getDiscountRulesAfterCreateResult.data.data.length === 1,
      getDiscountRulesAfterCreateResult.success ? `Found ${getDiscountRulesAfterCreateResult.data.data.length} discount rules` : getDiscountRulesAfterCreateResult.error?.message);
  }
  
  return discountRuleId;
}

async function testErrorHandling(context) {
  console.log('\n⚠️ Testing Error Handling...');
  
  // Test 1: Invalid tax rate data
  const invalidTaxRateData = {
    name: '',
    rate: 1.5, // Invalid rate > 1
    description: 'This should fail'
  };
  
  const createInvalidTaxRateResult = await makeAuthenticatedRequest('POST', '/api/tax-rates', invalidTaxRateData, context);
  logResult('POST Invalid Tax Rate', !createInvalidTaxRateResult.success,
    !createInvalidTaxRateResult.success ? `Correctly rejected invalid data: ${createInvalidTaxRateResult.error?.message}` : 'Should have failed validation');
  
  // Test 2: Invalid discount rule data
  const invalidDiscountRuleData = {
    name: 'Test',
    type: 'invalid_type',
    value: -10
  };
  
  const createInvalidDiscountRuleResult = await makeAuthenticatedRequest('POST', '/api/discount-rules', invalidDiscountRuleData, context);
  logResult('POST Invalid Discount Rule', !createInvalidDiscountRuleResult.success,
    !createInvalidDiscountRuleResult.success ? `Correctly rejected invalid data: ${createInvalidDiscountRuleResult.error?.message}` : 'Should have failed validation');
  
  // Test 3: Access non-existent tax rate
  const getNonExistentTaxRateResult = await makeAuthenticatedRequest('GET', '/api/tax-rates/00000000-0000-0000-0000-000000000000', null, context);
  logResult('GET Non-existent Tax Rate', getNonExistentTaxRateResult.status === 404,
    getNonExistentTaxRateResult.status === 404 ? 'Correctly returned 404' : `Status: ${getNonExistentTaxRateResult.status}`);
  
  // Test 4: Validate non-existent coupon
  const validateInvalidCouponResult = await makeAuthenticatedRequest('POST', '/api/discount-rules/validate-coupon', 
    { coupon_code: 'INVALID_COUPON_CODE' }, context);
  logResult('POST Validate Invalid Coupon', validateInvalidCouponResult.status === 404,
    validateInvalidCouponResult.status === 404 ? 'Correctly rejected invalid coupon' : `Status: ${validateInvalidCouponResult.status}`);
}

async function runNewEndpointsTest() {
  console.log('🔧 NEW ENDPOINTS TEST SUITE');
  console.log('='.repeat(50));
  console.log(`🎯 Testing against: ${BASE_URL}`);
  console.log(`📊 Testing tax-rates and discount-rules endpoints...`);
  console.log('');
  
  try {
    // Setup test business
    const context = await setupTestBusiness();
    if (!context) {
      console.log('💥 Cannot proceed without test business setup');
      return false;
    }
    
    results.context = context;
    
    // Test tax rates endpoints
    const taxRateId = await testTaxRatesEndpoints(context);
    
    // Test discount rules endpoints
    const discountRuleId = await testDiscountRulesEndpoints(context);
    
    // Test error handling
    await testErrorHandling(context);
    
    // Cleanup test (delete created resources)
    console.log('\n🧹 Cleaning up test resources...');
    
    if (discountRuleId) {
      const deleteDiscountRuleResult = await makeAuthenticatedRequest('DELETE', `/api/discount-rules/${discountRuleId}`, null, context);
      logResult('DELETE Discount Rule (Cleanup)', deleteDiscountRuleResult.success,
        deleteDiscountRuleResult.success ? 'Discount rule deleted successfully' : deleteDiscountRuleResult.error?.message);
    }
    
    if (taxRateId) {
      const deleteTaxRateResult = await makeAuthenticatedRequest('DELETE', `/api/tax-rates/${taxRateId}`, null, context);
      logResult('DELETE Tax Rate (Cleanup)', deleteTaxRateResult.success,
        deleteTaxRateResult.success ? 'Tax rate deleted successfully' : deleteTaxRateResult.error?.message);
    }
    
  } catch (error) {
    console.error('💥 New endpoints test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
  
  // Summary
  console.log('\n📊 NEW ENDPOINTS TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.tests.length || 1)) * 100)}%`);
  
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
  console.log(`\n${success ? '🎉 ALL NEW ENDPOINTS WORKING!' : '⚠️  SOME NEW ENDPOINTS FAILED'}`);
  console.log(success ? 
    'Tax rates and discount rules APIs are ready for production!' : 
    'Some new endpoints need attention before release.'
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
    console.error('Please start the server first.');
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
  
  const success = await runNewEndpointsTest();
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the new endpoints test
main().catch(console.error);