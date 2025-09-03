#!/usr/bin/env node

/**
 * Check the current schema of orders table and verify organization_id column
 */

const { DatabaseConfig } = require('../config/database');

async function checkOrdersSchema() {
  console.log('🔍 Checking orders table schema...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Test if we can query orders table
    console.log('\n📋 Testing orders table access...');
    const { data: orderTest, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (orderError) {
      console.log('❌ Orders table error:', orderError.message);
      return;
    }
    
    console.log('✅ Orders table is accessible');
    
    // Test inserting with organization_id
    console.log('\n🧪 Testing organization_id column...');
    const testOrder = {
      status: 'pending',
      total_price: 100.00,
      organization_id: '00000000-0000-0000-0000-000000000001', // Test UUID
      order_date: new Date().toISOString()
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select();
    
    if (insertError) {
      if (insertError.message.includes('organization_id')) {
        console.log('❌ ORGANIZATION_ID MISSING');
        console.log('The orders table does not have organization_id column');
        console.log('');
        console.log('🔧 SOLUTION: Add organization_id column to orders table');
        return 'missing_org_id';
      } else {
        console.log('⚠️  Insert error (other):', insertError.message);
        return 'other_error';
      }
    }
    
    console.log('✅ ORGANIZATION_ID COLUMN EXISTS');
    console.log('Created test order:', insertTest[0].order_id);
    
    // Clean up test data
    await supabase
      .from('orders')
      .delete()
      .eq('order_id', insertTest[0].order_id);
    
    console.log('🧹 Test data cleaned up');
    
    // Also check order_details
    console.log('\n📋 Testing order_details table...');
    const { data: detailTest, error: detailError } = await supabase
      .from('order_details')
      .select('*')
      .limit(1);
    
    if (detailError) {
      console.log('❌ Order_details error:', detailError.message);
    } else {
      console.log('✅ Order_details table is accessible');
    }
    
    return 'ready';
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
    return 'failed';
  }
}

async function main() {
  console.log('🔍 BETALI ORDERS SCHEMA CHECK');
  console.log('=============================');
  console.log('');
  
  const result = await checkOrdersSchema();
  
  console.log('');
  console.log('📋 SCHEMA CHECK RESULT:', result);
  console.log('');
  
  switch (result) {
    case 'missing_org_id':
      console.log('🚨 ACTION REQUIRED: Add organization_id to orders table');
      console.log('Run: ALTER TABLE orders ADD COLUMN organization_id UUID REFERENCES organizations(organization_id);');
      process.exit(1);
      
    case 'ready':
      console.log('✅ ORDERS SCHEMA READY');
      console.log('The orders table has organization_id and is ready for implementation');
      break;
      
    case 'other_error':
      console.log('⚠️  PARTIAL ISSUE');
      console.log('Orders table accessible but some validation failed');
      break;
      
    case 'failed':
      console.log('💥 SCHEMA CHECK FAILED');
      console.log('Check database connection and permissions');
      process.exit(1);
  }
}

main();