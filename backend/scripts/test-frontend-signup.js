#!/usr/bin/env node

/**
 * Test script to manually validate the complete signup flow
 * This script provides test data that can be used in the frontend
 */

const { v4: uuidv4 } = require('uuid');

console.log('🧪 COMPLETE SIGNUP FLOW TEST DATA');
console.log('================================');
console.log('');

// Generate unique test data
const testData = {
  name: 'Test User',
  email: `test.user.${Date.now()}@betali.com`,
  password: 'TestPassword123!',
  organizationName: 'Test Company Inc'
};

console.log('📋 Use this data to test frontend signup:');
console.log('----------------------------------------');
console.log(`Name: ${testData.name}`);
console.log(`Email: ${testData.email}`);
console.log(`Password: ${testData.password}`);
console.log(`Organization: ${testData.organizationName}`);
console.log('');

console.log('🔗 URLs to test:');
console.log('Frontend: http://localhost:3000/register');
console.log('Backend Health: http://localhost:4000/health');
console.log('');

console.log('📋 Expected signup flow:');
console.log('1. Fill form with data above');
console.log('2. Accept terms and conditions');
console.log('3. Click "Create account"');
console.log('4. Should redirect to /dashboard?welcome=true');
console.log('5. Check backend logs for successful signup');
console.log('');

console.log('✅ Both servers should be running:');
console.log('- Backend: bun run dev (port 4000)');
console.log('- Frontend: bun run front (port 3000)');