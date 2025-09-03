#!/usr/bin/env node

/**
 * Apply the orders organization_id migration using Supabase
 */

const { DatabaseConfig } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function applyOrdersMigration() {
  console.log('🚀 Applying orders organization_id migration...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-orders-organization-id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL migration file loaded');
    
    // Execute the migration
    console.log('🔄 Executing migration...');
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      return false;
    }
    
    console.log('✅ Migration executed successfully');
    
    // Verify the migration worked
    console.log('\n🧪 Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('orders')
      .select('organization_id')
      .limit(0); // Just test structure
    
    if (verifyError) {
      if (verifyError.message.includes('organization_id')) {
        console.log('❌ Migration verification failed - organization_id column not found');
        return false;
      } else {
        console.log('⚠️  Migration verification had issues:', verifyError.message);
      }
    } else {
      console.log('✅ Migration verified - organization_id column exists in orders table');
    }
    
    // Also verify order_details
    const { data: verifyDetailsData, error: verifyDetailsError } = await supabase
      .from('order_details')
      .select('organization_id')
      .limit(0);
    
    if (verifyDetailsError) {
      if (verifyDetailsError.message.includes('organization_id')) {
        console.log('❌ Order_details migration verification failed - organization_id column not found');
        return false;
      } else {
        console.log('⚠️  Order_details verification had issues:', verifyDetailsError.message);
      }
    } else {
      console.log('✅ Order_details migration verified - organization_id column exists');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Migration application failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 BETALI ORDERS MIGRATION');
  console.log('===========================');
  console.log('');
  
  const success = await applyOrdersMigration();
  
  console.log('');
  if (success) {
    console.log('🎉 MIGRATION SUCCESSFUL');
    console.log('Orders table is now ready for multi-tenant SaaS implementation');
    console.log('');
    console.log('Next steps:');
    console.log('1. Implement OrderRepository');
    console.log('2. Implement OrderService');
    console.log('3. Implement OrderController');
    console.log('4. Create frontend components');
  } else {
    console.log('❌ MIGRATION FAILED');
    console.log('Manual intervention may be required');
    console.log('Check the database and fix any issues before proceeding');
    process.exit(1);
  }
}

main();