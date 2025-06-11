const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Database configuration and connection setup
 * Implements Singleton pattern for database connection
 */
class DatabaseConfig {
  constructor() {
    if (DatabaseConfig.instance) {
      return DatabaseConfig.instance;
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    DatabaseConfig.instance = this;
  }

  /**
   * Get Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Health check for database connection
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        connection: 'active'
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * Test basic CRUD operations
   * @returns {Promise<Object>} Test results
   */
  async runConnectionTests() {
    const tests = [];
    
    try {
      // Test products table
      const { error: productsError } = await this.supabase
        .from('products')
        .select('count', { count: 'exact', head: true });
      
      tests.push({
        table: 'products',
        status: productsError ? 'failed' : 'passed',
        error: productsError?.message
      });

      // Test warehouse table
      const { error: warehouseError } = await this.supabase
        .from('warehouse')
        .select('count', { count: 'exact', head: true });
      
      tests.push({
        table: 'warehouse',
        status: warehouseError ? 'failed' : 'passed',
        error: warehouseError?.message
      });

      // Test stock_movements table
      const { error: movementsError } = await this.supabase
        .from('stock_movements')
        .select('count', { count: 'exact', head: true });
      
      tests.push({
        table: 'stock_movements',
        status: movementsError ? 'failed' : 'passed',
        error: movementsError?.message
      });

      const allPassed = tests.every(test => test.status === 'passed');
      
      return {
        overall: allPassed ? 'passed' : 'failed',
        tests,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Connection tests failed: ${error.message}`);
    }
  }
}

module.exports = { DatabaseConfig };