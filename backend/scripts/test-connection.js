/**
 * Database connection test script
 * Usage: npm run db:test
 */
const { DatabaseConfig } = require('../config/database');
const { Logger } = require('../utils/Logger');

const logger = new Logger('DBTest');

async function testConnection() {
  try {
    logger.info('Testing database connection...');
    
    const dbConfig = new DatabaseConfig();
    const result = await dbConfig.healthCheck();
    
    logger.info('Database connection successful!', result);
    
    const client = dbConfig.getClient();
    
    const { data: products, error: productsError } = await client
      .from('products')
      .select('count', { count: 'exact', head: true });
    
    if (productsError) {
      logger.error('Products table test failed:', productsError.message);
    } else {
      logger.info(`Products table accessible. Count: ${products || 0}`);
    }
    
    const { data: warehouses, error: warehousesError } = await client
      .from('warehouse')
      .select('count', { count: 'exact', head: true });
    
    if (warehousesError) {
      logger.error('Warehouse table test failed:', warehousesError.message);
    } else {
      logger.info(`Warehouse table accessible. Count: ${warehouses || 0}`);
    }
    
    logger.info('All database tests completed successfully!');
    process.exit(0);
    
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();