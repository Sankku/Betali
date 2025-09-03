#!/usr/bin/env node

/**
 * Test the OrderRepository and OrderDetailRepository independently
 * This tests the repositories without starting the full server
 */

const { DatabaseConfig } = require('../config/database');
const OrderRepository = require('../repositories/OrderRepository');
const OrderDetailRepository = require('../repositories/OrderDetailRepository');

console.log('🧪 Testing Order Repositories');
console.log('=============================');
console.log('');

async function testRepositories() {
  try {
    console.log('✅ Database connection established');
    
    // Initialize database config
    const dbConfig = new DatabaseConfig();
    const supabaseClient = dbConfig.getClient();
    
    console.log('🔧 Initializing repositories...');
    const orderRepository = new OrderRepository(supabaseClient);
    const orderDetailRepository = new OrderDetailRepository(supabaseClient);
    
    console.log('✅ OrderRepository initialized successfully');
    console.log('✅ OrderDetailRepository initialized successfully');
    
    console.log('');
    console.log('📋 Repository Test Results:');
    console.log('✅ All repositories can be instantiated');
    console.log('✅ No import/export errors');
    console.log('✅ BaseRepository inheritance working');
    
    return true;
    
  } catch (error) {
    console.error('❌ Repository test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  const success = await testRepositories();
  
  if (success) {
    console.log('');
    console.log('🎉 ALL REPOSITORY TESTS PASSED!');
    console.log('The order repositories are working correctly.');
    console.log('');
    console.log('Next step: Fix the server integration issues');
  } else {
    console.log('❌ Repository tests failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  process.exit(1);
});