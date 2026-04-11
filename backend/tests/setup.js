/**
 * Test Setup and Configuration
 * Sets up Jest testing environment for Betali backend
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  baseURL: 'http://localhost:4000',
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  }
};

// Global test utilities
global.testUtils = {
  // Generate test data
  generateTestUser: () => ({
    user_id: require('crypto').randomUUID(),
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@betali.test`,
    name: `Test User ${Date.now()}`,
    password_hash: 'test_hash'
  }),

  generateTestOrganization: (ownerUserId) => ({
    name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    owner_user_id: ownerUserId
  }),

  generateTestProduct: (organizationId) => ({
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    batch_number: `BATCH-${Date.now()}`,
    expiration_date: '2025-12-31',
    origin_country: 'Argentina',
    price: 99.99,
    organization_id: organizationId
  }),

  // API helpers
  makeRequest: async (method, endpoint, data = null, headers = {}) => {
    const axios = require('axios');
    
    try {
      const config = {
        method,
        url: `${TEST_CONFIG.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        timeout: TEST_CONFIG.timeout
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 0,
        details: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      };
    }
  },

  // Database utilities
  cleanupTestData: async () => {
    const supabase = createClient(
      TEST_CONFIG.supabase.url,
      TEST_CONFIG.supabase.serviceKey
    );

    try {
      // Delete test users (this will cascade to related data)
      await supabase
        .from('users')
        .delete()
        .like('email', '%@betali.test');

      // Delete test organizations
      await supabase
        .from('organizations')
        .delete()
        .like('slug', 'test-org-%');

      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.warn('⚠️  Failed to cleanup test data:', error.message);
    }
  },

  // Wait for server to be ready
  waitForServer: async (maxAttempts = 10, delay = 1000) => {
    const axios = require('axios');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${TEST_CONFIG.baseURL}/health`, { timeout: 5000 });
        return true;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Server not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Jest setup hooks
beforeAll(async () => {
  // Unit tests don't need the server running
  const testPath = expect.getState().testPath || '';
  const isLocalTest = testPath.includes('/unit/') || testPath.includes('/generated/');
  if (!isLocalTest) {
    await global.testUtils.waitForServer();
  }
});

afterEach(async () => {
  // Unit/generated tests don't need DB cleanup
  const testPath = expect.getState().testPath || '';
  const isLocalTest = testPath.includes('/unit/') || testPath.includes('/generated/');
  if (!isLocalTest) {
    await global.testUtils.cleanupTestData();
  }
});

module.exports = TEST_CONFIG;