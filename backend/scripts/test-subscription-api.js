const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:4000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, fn) {
  try {
    log(`\n📋 Testing: ${name}`, 'cyan');
    const result = await fn();
    log(`✅ PASS: ${name}`, 'green');
    return { name, success: true, result };
  } catch (error) {
    log(`❌ FAIL: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return { name, success: false, error: error.message };
  }
}

async function runTests() {
  log('🚀 Starting Subscription Plans API Tests\n', 'blue');
  log('━'.repeat(60), 'blue');

  const results = [];

  // Test 1: Get all public plans
  results.push(await testEndpoint('GET /api/subscription-plans', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans`);
    console.log(`   Found ${response.data.data.length} plans`);
    response.data.data.forEach(plan => {
      console.log(`      - ${plan.display_name}: $${plan.price_monthly}/mo`);
    });
    return response.data;
  }));

  // Test 2: Get plans comparison
  results.push(await testEndpoint('GET /api/subscription-plans/comparison', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/comparison`);
    console.log(`   Found ${response.data.data.length} plans in comparison`);
    response.data.data.forEach(plan => {
      console.log(`      - ${plan.displayName}:`);
      console.log(`         Monthly: ${plan.pricing.monthly}`);
      console.log(`         Yearly: ${plan.pricing.yearly}`);
      console.log(`         Savings: ${plan.pricing.savings}%`);
    });
    return response.data;
  }));

  // Test 3: Get specific plan by name - Free
  results.push(await testEndpoint('GET /api/subscription-plans/name/free', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/name/free`);
    const plan = response.data.data;
    console.log(`   Plan: ${plan.display_name}`);
    console.log(`   Price: $${plan.price_monthly}/mo`);
    console.log(`   Max Users: ${plan.max_users}`);
    console.log(`   Max Products: ${plan.max_products}`);
    return response.data;
  }));

  // Test 4: Get specific plan by name - Professional
  results.push(await testEndpoint('GET /api/subscription-plans/name/professional', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/name/professional`);
    const plan = response.data.data;
    console.log(`   Plan: ${plan.display_name}`);
    console.log(`   Price: $${plan.price_monthly}/mo`);
    console.log(`   Features:`, JSON.stringify(plan.features, null, 2));
    return response.data;
  }));

  // Test 5: Get plan limits
  results.push(await testEndpoint('GET /api/subscription-plans/starter/limits', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/starter/limits`);
    const limits = response.data.data;
    console.log(`   Limits for Starter plan:`);
    Object.entries(limits).forEach(([key, value]) => {
      console.log(`      ${key}: ${value === -1 ? 'Unlimited' : value}`);
    });
    return response.data;
  }));

  // Test 6: Check feature availability
  results.push(await testEndpoint('GET /api/subscription-plans/professional/features/api_access', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/professional/features/api_access`);
    const hasFeature = response.data.data.hasFeature;
    console.log(`   Professional plan has API access: ${hasFeature}`);
    return response.data;
  }));

  // Test 7: Check feature not available in free plan
  results.push(await testEndpoint('GET /api/subscription-plans/free/features/advanced_analytics', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/free/features/advanced_analytics`);
    const hasFeature = response.data.data.hasFeature;
    console.log(`   Free plan has advanced analytics: ${hasFeature}`);
    return response.data;
  }));

  // Test 8: Check enterprise unlimited limits
  results.push(await testEndpoint('GET /api/subscription-plans/enterprise/limits', async () => {
    const response = await axios.get(`${API_URL}/api/subscription-plans/enterprise/limits`);
    const limits = response.data.data;
    const unlimitedCount = Object.values(limits).filter(v => v === -1).length;
    console.log(`   Enterprise plan has ${unlimitedCount} unlimited resources`);
    return response.data;
  }));

  // Test 9: Get non-existent plan (should fail gracefully)
  results.push(await testEndpoint('GET /api/subscription-plans/name/nonexistent (expect 404)', async () => {
    try {
      await axios.get(`${API_URL}/api/subscription-plans/name/nonexistent`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ✓ Correctly returned 404 for non-existent plan`);
        return { expected: true };
      }
      throw error;
    }
  }));

  // Print summary
  log('\n' + '━'.repeat(60), 'blue');
  log('\n📊 Test Summary:', 'blue');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`   📋 Total:  ${results.length}`, 'cyan');

  if (failed === 0) {
    log('\n🎉 All tests passed!\n', 'green');
  } else {
    log('\n⚠️  Some tests failed. See details above.\n', 'yellow');
    process.exit(1);
  }
}

// Run tests
log('Starting API tests against: ' + API_URL, 'cyan');
log('Make sure the backend server is running!\n', 'yellow');

runTests().catch(error => {
  log('\n💥 Fatal error running tests:', 'red');
  console.error(error);
  process.exit(1);
});
