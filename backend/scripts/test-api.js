/**
 * Comprehensive API testing script
 * Usage: node scripts/test-api.js [--token=JWT_TOKEN] [--endpoint=specific_endpoint]
 */
const { Logger } = require('../utils/Logger');

const logger = new Logger('APITester');

class APITester {
  constructor(baseUrl = 'http://localhost:4000', token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Make HTTP request with proper headers
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        status: 0,
        statusText: 'FETCH_ERROR',
        error: error.message
      };
    }
  }

  /**
   * Test public endpoints (no authentication required)
   */
  async testPublicEndpoints() {
    logger.info('🌐 Testing public endpoints...');

    const publicTests = [
      { name: 'Health Check', endpoint: '/health' },
      { name: 'Detailed Health', endpoint: '/health/detailed' },
      { name: 'Readiness Probe', endpoint: '/health/ready' },
      { name: 'Liveness Probe', endpoint: '/health/live' },
      { name: 'Root Endpoint', endpoint: '/' }
    ];

    for (const test of publicTests) {
      try {
        const result = await this.makeRequest(test.endpoint);
        
        if (result.status >= 200 && result.status < 300) {
          logger.info(`✅ ${test.name}: ${result.status} ${result.statusText}`);
          if (test.endpoint === '/') {
            logger.info(`   Endpoints: ${JSON.stringify(result.data.endpoints, null, 2)}`);
          }
        } else {
          logger.warn(`⚠️ ${test.name}: ${result.status} ${result.statusText}`);
        }
      } catch (error) {
        logger.error(`❌ ${test.name}: ${error.message}`);
      }
    }
  }

  /**
   * Test protected endpoints (authentication required)
   */
  async testProtectedEndpoints() {
    logger.info('🔒 Testing protected endpoints...');

    if (!this.token) {
      logger.warn('⚠️ No token provided. Testing without authentication (should return 401)...');
    }

    const protectedTests = [
      { name: 'Products List', endpoint: '/api/products', method: 'GET' },
      { name: 'Product Search', endpoint: '/api/products/search?q=test', method: 'GET' },
      { name: 'Expiring Products', endpoint: '/api/products/expiring?days=30', method: 'GET' },
      { name: 'Warehouses List', endpoint: '/api/warehouse', method: 'GET' },
      { name: 'Dashboard Overview', endpoint: '/api/dashboard', method: 'GET' },
      { name: 'Dashboard Activity', endpoint: '/api/dashboard/activity', method: 'GET' },
      { name: 'Dashboard Stats', endpoint: '/api/dashboard/stats', method: 'GET' },
      { name: 'Dashboard Analytics', endpoint: '/api/dashboard/analytics?period=30d&type=overview', method: 'GET' },
    ];

    for (const test of protectedTests) {
      try {
        const result = await this.makeRequest(test.endpoint, test.method);
        
        if (!this.token && result.status === 401) {
          logger.info(`✅ ${test.name}: Correctly requires authentication (401)`);
        } else if (this.token && result.status >= 200 && result.status < 300) {
          logger.info(`✅ ${test.name}: ${result.status} ${result.statusText}`);
          if (result.data && result.data.data) {
            const dataType = Array.isArray(result.data.data) ? 'array' : typeof result.data.data;
            const count = Array.isArray(result.data.data) ? result.data.data.length : 'N/A';
            logger.info(`   Response: ${dataType} (${count} items)`);
          }
        } else {
          logger.warn(`⚠️ ${test.name}: ${result.status} ${result.statusText}`);
          if (result.data && result.data.error) {
            logger.warn(`   Error: ${result.data.error}`);
          }
        }
      } catch (error) {
        logger.error(`❌ ${test.name}: ${error.message}`);
      }
    }
  }

  /**
   * Test CRUD operations (requires authentication)
   */
  async testCRUDOperations() {
    if (!this.token) {
      logger.info('🔒 Skipping CRUD tests - no authentication token provided');
      return;
    }

    logger.info('📝 Testing CRUD operations...');

    // Test creating a product
    const testProduct = {
      name: 'Test Product API',
      batch_number: `TEST-${Date.now()}`,
      origin_country: 'Argentina',
      expiration_date: '2024-12-31',
      description: 'Test product created by API test script'
    };

    try {
      // CREATE
      logger.info('Creating test product...');
      const createResult = await this.makeRequest('/api/products', 'POST', testProduct);
      
      if (createResult.status === 201) {
        const productId = createResult.data.data.product_id;
        logger.info(`✅ Product created: ${productId}`);

        // READ
        logger.info('Reading created product...');
        const readResult = await this.makeRequest(`/api/products/${productId}`, 'GET');
        if (readResult.status === 200) {
          logger.info(`✅ Product read successfully`);
        }

        // UPDATE
        logger.info('Updating product...');
        const updateData = { description: 'Updated by API test script' };
        const updateResult = await this.makeRequest(`/api/products/${productId}`, 'PUT', updateData);
        if (updateResult.status === 200) {
          logger.info(`✅ Product updated successfully`);
        }

        // DELETE
        logger.info('Deleting test product...');
        const deleteResult = await this.makeRequest(`/api/products/${productId}`, 'DELETE');
        if (deleteResult.status === 200) {
          logger.info(`✅ Product deleted successfully`);
        }
      } else {
        logger.error(`❌ Failed to create product: ${createResult.status} ${createResult.statusText}`);
        if (createResult.data && createResult.data.error) {
          logger.error(`   Error: ${createResult.data.error}`);
        }
      }
    } catch (error) {
      logger.error(`❌ CRUD test failed: ${error.message}`);
    }
  }

  /**
   * Test specific endpoint
   */
  async testSpecificEndpoint(endpoint) {
    logger.info(`🎯 Testing specific endpoint: ${endpoint}`);
    
    try {
      const result = await this.makeRequest(endpoint);
      
      logger.info(`Status: ${result.status} ${result.statusText}`);
      logger.info(`Response:`, JSON.stringify(result.data, null, 2));
      
      if (result.headers) {
        logger.info(`Headers:`, JSON.stringify(result.headers, null, 2));
      }
    } catch (error) {
      logger.error(`Error testing endpoint: ${error.message}`);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    logger.info('🚀 Starting comprehensive API tests...');
    logger.info(`Base URL: ${this.baseUrl}`);
    logger.info(`Token: ${this.token ? 'Provided' : 'Not provided'}`);
    
    await this.testPublicEndpoints();
    await this.testProtectedEndpoints();
    await this.testCRUDOperations();
    
    logger.info('✨ API tests completed!');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    token: null,
    endpoint: null,
    help: false
  };

  for (const arg of args) {
    if (arg.startsWith('--token=')) {
      config.token = arg.split('=')[1];
    } else if (arg.startsWith('--endpoint=')) {
      config.endpoint = arg.split('=')[1];
    } else if (arg.startsWith('--url=')) {
      config.baseUrl = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      config.help = true;
    }
  }

  return config;
}

// Show help
function showHelp() {
  console.log(`
🧪 AgroPanel API Tester

Usage: node scripts/test-api.js [options]

Options:
  --token=JWT_TOKEN    Provide JWT token for authenticated requests
  --url=BASE_URL       API base URL (default: http://localhost:4000)
  --endpoint=PATH      Test specific endpoint only
  --help, -h           Show this help

Examples:
  # Test all public endpoints
  node scripts/test-api.js

  # Test with authentication
  node scripts/test-api.js --token=eyJhbGciOiJIUzI1NiIs...

  # Test specific endpoint
  node scripts/test-api.js --endpoint=/api/products --token=your_token

  # Test against different server
  node scripts/test-api.js --url=https://api.agropanel.com

Environment Variables:
  API_BASE_URL         Default base URL for API
  TEST_JWT_TOKEN       Default JWT token for authenticated tests
`);
}

// Main execution
async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    return;
  }

  // Use environment variable as fallback for token
  if (!config.token && process.env.TEST_JWT_TOKEN) {
    config.token = process.env.TEST_JWT_TOKEN;
  }

  const tester = new APITester(config.baseUrl, config.token);

  if (config.endpoint) {
    await tester.testSpecificEndpoint(config.endpoint);
  } else {
    await tester.runAllTests();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { APITester };