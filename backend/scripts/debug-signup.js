#!/usr/bin/env node

/**
 * Debug Signup Issues
 * Tests individual components to identify the problem
 */

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:4000';

async function debugHealth() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health failed:', error.message);
    return false;
  }
}

async function debugSignup() {
  console.log('\n👤 Testing Signup Endpoint...');
  const userData = {
    user_id: uuidv4(),
    email: `debug-${Date.now()}@betali.test`,
    name: 'Debug User',
    organization_name: 'Debug Organization'
  };

  try {
    console.log('📤 Sending request:', userData);
    
    const response = await axios.post(`${BASE_URL}/api/auth/complete-signup`, userData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ Signup successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data, userData };
    
  } catch (error) {
    console.error('❌ Signup failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received');
      console.error('Request timeout or connection error');
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return { success: false, error };
  }
}

async function debugSignupStatus(userId) {
  console.log('\n📋 Testing Signup Status Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/signup-status/${userId}`, {
      timeout: 10000
    });
    
    console.log('✅ Status check successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.error('❌ Status check failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

async function debugProducts() {
  console.log('\n📦 Testing Products Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/api/products`, {
      timeout: 10000
    });
    
    console.log('✅ Products endpoint successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.error('❌ Products endpoint failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      // Auth specific debugging
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('🔐 This is an authentication issue - expected for now');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

async function main() {
  console.log('🔍 SIGNUP DEBUG SESSION');
  console.log('=======================');
  
  try {
    // 1. Health check
    const healthOK = await debugHealth();
    if (!healthOK) {
      console.log('❌ Cannot continue - server not responding');
      return;
    }
    
    // 2. Test signup
    const signupResult = await debugSignup();
    
    // 3. Test signup status (even if signup failed)
    const testUserId = signupResult.userData?.user_id || uuidv4();
    await debugSignupStatus(testUserId);
    
    // 4. Test products (to understand auth requirements)
    await debugProducts();
    
    // Summary
    console.log('\n📊 DEBUG SUMMARY');
    console.log('================');
    console.log('Health:', healthOK ? '✅' : '❌');
    console.log('Signup:', signupResult.success ? '✅' : '❌');
    console.log('');
    
    if (!signupResult.success) {
      console.log('🔍 NEXT STEPS TO INVESTIGATE:');
      console.log('1. Check server logs for detailed error messages');
      console.log('2. Verify validation middleware is working correctly');  
      console.log('3. Check database connection and constraints');
      console.log('4. Verify ServiceFactory is properly configured');
    } else {
      console.log('🎉 Signup is working! The test suite issue might be elsewhere.');
    }
    
  } catch (error) {
    console.error('💥 Debug session crashed:', error.message);
  }
}

main().catch(console.error);