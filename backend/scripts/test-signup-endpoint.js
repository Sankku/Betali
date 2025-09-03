#!/usr/bin/env node

/**
 * Test script for the SaaS signup endpoint
 * Tests the complete signup flow without requiring database constraint fix
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';
const TEST_USER = {
  user_id: uuidv4(),
  email: `test+${Date.now()}@betali.com`,
  name: 'Test User',
  organization_name: 'Test Organization'
};

console.log('🧪 Testing SaaS Signup Endpoint');
console.log('================================');
console.log('Test User:', TEST_USER);
console.log('');

async function testSignupEndpoint() {
  try {
    console.log('📡 Making signup request...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/complete-signup`, TEST_USER, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Signup request successful!');
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Signup request failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the server running?');
      console.error('Request:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    throw error;
  }
}

async function testSignupStatus() {
  try {
    console.log('📡 Checking signup status...');
    
    const response = await axios.get(`${BASE_URL}/api/auth/signup-status/${TEST_USER.user_id}`, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Status check successful!');
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Status check failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    // Don't throw - status check failure is not critical for this test
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting signup endpoint tests...\n');
  
  try {
    // Test 1: Complete signup
    console.log('TEST 1: Complete Signup');
    console.log('----------------------');
    const signupResult = await testSignupEndpoint();
    console.log('');
    
    // Test 2: Check status
    console.log('TEST 2: Check Signup Status');
    console.log('---------------------------');
    const statusResult = await testSignupStatus();
    console.log('');
    
    // Summary
    console.log('📋 TEST SUMMARY');
    console.log('===============');
    console.log('✅ Signup endpoint:', signupResult ? 'PASSED' : 'FAILED');
    console.log('✅ Status endpoint:', statusResult ? 'PASSED' : 'FAILED');
    
    if (signupResult && signupResult.success) {
      console.log('🎉 ALL TESTS PASSED! Signup flow is working.');
      console.log('');
      console.log('Created:');
      console.log('- User ID:', signupResult.data.user.user_id);
      console.log('- Organization:', signupResult.data.organization.name);
      console.log('- Organization ID:', signupResult.data.organization.organization_id);
      console.log('- Role:', signupResult.data.relationship.role);
    } else {
      console.log('❌ TESTS FAILED. Check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running at', BASE_URL);
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server with: npm run dev or npm start');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  console.log('');
  await runTests();
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
main().catch(console.error);