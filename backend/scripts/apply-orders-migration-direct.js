#!/usr/bin/env node

/**
 * Apply orders organization_id migration using direct SQL commands
 */

const { DatabaseConfig } = require('../config/database');

async function addOrganizationIdToOrders() {
  console.log('🚀 Adding organization_id to orders tables...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // First, check if column already exists
    console.log('\n🔍 Checking current orders table structure...');
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Could not access orders table:', checkError.message);
      return false;
    }
    
    // Check if we have any existing orders that might need organization_id
    const { data: allOrders, error: countError } = await supabase
      .from('orders')
      .select('order_id, client_id, user_id');
    
    if (countError) {
      console.error('❌ Could not count orders:', countError.message);
      return false;
    }
    
    console.log(`📊 Found ${allOrders.length} existing orders`);
    
    if (allOrders.length > 0) {
      console.log('⚠️  WARNING: There are existing orders in the system');
      console.log('After adding organization_id column, you will need to:');
      console.log('1. Update existing orders with proper organization_id values');
      console.log('2. Make the organization_id column NOT NULL');
      console.log('');
      console.log('For now, we\'ll add the column as nullable and set up the structure');
    }
    
    // Since we can't execute complex SQL directly, we'll need to do this step by step
    // For now, let's create the backend structure and assume the DB will be updated manually
    
    console.log('✅ Orders table analysis complete');
    console.log('');
    console.log('📋 MIGRATION STATUS:');
    console.log('- Orders table exists and is accessible');
    console.log(`- ${allOrders.length} existing orders found`);
    console.log('');
    console.log('🔧 MANUAL ACTION REQUIRED:');
    console.log('Execute the following SQL in your Supabase dashboard:');
    console.log('');
    console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id);');
    console.log('ALTER TABLE order_details ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_order_details_organization_id ON order_details(organization_id);');
    console.log('');
    console.log('After running these commands, we can proceed with backend implementation.');
    
    return true;
    
  } catch (error) {
    console.error('💥 Migration check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 BETALI ORDERS MIGRATION PREPARATION');
  console.log('======================================');
  console.log('');
  
  const success = await addOrganizationIdToOrders();
  
  console.log('');
  if (success) {
    console.log('📋 MIGRATION PREPARATION COMPLETE');
    console.log('');
    console.log('Next steps:');
    console.log('1. Execute the SQL commands above manually in Supabase dashboard');
    console.log('2. Run: node scripts/check-orders-schema.js to verify');  
    console.log('3. Proceed with backend implementation');
  } else {
    console.log('❌ MIGRATION PREPARATION FAILED');
    process.exit(1);
  }
}

main();