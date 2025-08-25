#!/usr/bin/env node

/**
 * Debug script to check organization context issues
 */

const http = require('http');

async function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function debugOrganizationContext() {
  console.log('🔍 Debugging Organization Context...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

    // Test organizations endpoint without auth (should fail)
    console.log('2. Testing /api/organizations/my without auth (should fail)...');
    const noAuth = await makeRequest('/api/organizations/my');
    console.log(`   Status: ${noAuth.status}`);
    console.log(`   Response: ${JSON.stringify(noAuth.data, null, 2)}\n`);

    console.log('🔗 To complete diagnosis, you need to:');
    console.log('   1. Login to your app and get a JWT token');
    console.log('   2. Check browser DevTools → Application → Local Storage');
    console.log('   3. Look for "currentOrganizationId" and authentication tokens');
    console.log('   4. Check DevTools Console for organization context logs');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

// Run with different ports
debugOrganizationContext();