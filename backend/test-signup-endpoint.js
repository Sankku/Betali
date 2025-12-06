#!/usr/bin/env node

/**
 * Test the signup endpoint after constraint fix
 * This verifies that the complete signup flow works end-to-end
 */

const http = require('http');
const crypto = require('crypto');

const testData = {
  user_id: crypto.randomUUID(), // Generate a UUID for the test
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  password: 'TestPassword123!',
  organization_name: 'Test Organization'
};

console.log('🧪 TESTING SIGNUP ENDPOINT');
console.log('=========================\n');
console.log('Test data:', JSON.stringify(testData, null, 2));
console.log('\n📡 Sending request to http://localhost:4000/api/auth/complete-signup\n');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/complete-signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 RESPONSE RECEIVED');
    console.log('==================\n');
    console.log('Status Code:', res.statusCode);
    console.log('Status Message:', res.statusMessage);
    console.log('\nHeaders:', JSON.stringify(res.headers, null, 2));
    console.log('\nBody:');

    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));

      console.log('\n📊 ANALYSIS');
      console.log('==========\n');

      if (res.statusCode === 201) {
        console.log('✅ SUCCESS: Signup completed!');
        console.log('\nCreated:');
        console.log('  - User ID:', parsed.data?.user?.user_id);
        console.log('  - Email:', parsed.data?.user?.email);
        console.log('  - Organization ID:', parsed.data?.organization?.organization_id);
        console.log('  - Organization Name:', parsed.data?.organization?.name);
        console.log('  - Role:', parsed.data?.relationship?.role);
        console.log('  - Has Tokens:', !!parsed.data?.tokens?.access_token);

        console.log('\n🎉 CONSTRAINT FIX VERIFIED!');
        console.log('The signup endpoint is working correctly.');
        console.log('User was created, organization was created, and they were linked.');

      } else if (res.statusCode === 500) {
        console.log('❌ FAILED: Server error during signup');
        console.log('\nError:', parsed.message || parsed.error);

        if (data.includes('check_organization')) {
          console.log('\n🚨 CONSTRAINT ISSUE STILL EXISTS!');
          console.log('The constraint fix may not have been applied correctly.');
        } else {
          console.log('\n⚠️  Different error - may need investigation');
        }

      } else {
        console.log('⚠️  UNEXPECTED STATUS:', res.statusCode);
        console.log('Response:', parsed);
      }

    } catch (error) {
      console.log('⚠️  Could not parse response as JSON');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ REQUEST FAILED');
  console.error('================\n');
  console.error('Error:', error.message);
  console.error('\n💡 Make sure:');
  console.error('  1. Backend server is running (npm run dev or bun run dev)');
  console.error('  2. Server is listening on port 4000');
  console.error('  3. Database connection is working');
  console.error('\nTry running: cd backend && npm run dev');
});

req.write(postData);
req.end();
