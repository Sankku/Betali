/**
 * Script to test API endpoints
 * Usage: node scripts/test-endpoints.js
 */
const { Logger } = require('../utils/Logger');

const logger = new Logger('EndpointTest');

async function testEndpoints() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  
  try {
    logger.info('Testing API endpoints...');

    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      logger.info('✓ Health endpoint works correctly', healthData);
    } else {
      throw new Error('✗ Health endpoint failed');
    }

    const rootResponse = await fetch(`${baseUrl}/`);
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      logger.info('✓ Root endpoint works correctly', { 
        message: rootData.message,
        endpoints: rootData.endpoints 
      });
    } else {
      throw new Error('✗ Root endpoint failed');
    }

    // Test protected endpoints (without auth - should return 401)
    const protectedEndpoints = [
      '/api/products',
      '/api/warehouses',
      '/api/dashboard'
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.status === 401) {
        logger.info(`✓ Protected endpoint ${endpoint} correctly requires authentication`);
      } else {
        logger.warn(`⚠ Protected endpoint ${endpoint} returned status ${response.status} instead of 401`);
      }
    }

    logger.info('🎉 All endpoint tests completed!');
    
  } catch (error) {
    logger.error('Endpoint test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints };