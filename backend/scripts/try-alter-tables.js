const { DatabaseConfig } = require('../config/database');

/**
 * Try to add organization_id to remaining tables using JavaScript
 */
async function tryAlterTables() {
  console.log('🔧 Attempting to add organization_id to remaining tables...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Test if we can add a test client and see the error
    console.log('🧪 Testing table structure by attempting to insert test data...');
    
    const testOrgId = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4';
    
    // Test 1: Try to insert into clients with organization_id
    console.log('\n1. Testing clients table:');
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: 'TEST CLIENT',
          email: 'test@test.com',
          cuit: '20-12345678-9',
          organization_id: testOrgId
        })
        .select();
      
      if (error) {
        console.log(`   ❌ clients: ${error.message}`);
        if (error.message.includes('organization_id')) {
          console.log('   📝 clients table is missing organization_id column');
        }
      } else {
        console.log('   ✅ clients: organization_id column exists');
        // Clean up test data
        if (data && data[0]) {
          await supabase
            .from('clients')
            .delete()
            .eq('client_id', data[0].client_id);
          console.log('   🧹 Cleaned up test data');
        }
      }
    } catch (err) {
      console.log(`   ❌ clients: Exception - ${err.message}`);
    }
    
    // Test 2: Try to insert into orders with organization_id
    console.log('\n2. Testing orders table:');
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          total_amount: 100.00,
          status: 'pending',
          organization_id: testOrgId
        })
        .select();
      
      if (error) {
        console.log(`   ❌ orders: ${error.message}`);
        if (error.message.includes('organization_id')) {
          console.log('   📝 orders table is missing organization_id column');
        }
      } else {
        console.log('   ✅ orders: organization_id column exists');
        // Clean up test data
        if (data && data[0]) {
          await supabase
            .from('orders')
            .delete()
            .eq('order_id', data[0].order_id);
          console.log('   🧹 Cleaned up test data');
        }
      }
    } catch (err) {
      console.log(`   ❌ orders: Exception - ${err.message}`);
    }
    
    // Test 3: Try to create a simple view that would show us table structure
    console.log('\n3. Alternative approach - checking what columns exist:');
    
    // For clients
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .limit(0);
      
      console.log(`   clients select: ${clientError ? 'Error' : 'Success'}`);
      if (clientError) {
        console.log(`     ${clientError.message}`);
      }
    } catch (err) {
      console.log(`   clients: ${err.message}`);
    }
    
    // For orders
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .limit(0);
      
      console.log(`   orders select: ${orderError ? 'Error' : 'Success'}`);
      if (orderError) {
        console.log(`     ${orderError.message}`);
      }
    } catch (err) {
      console.log(`   orders: ${err.message}`);
    }
    
    console.log('\n📋 Summary:');
    console.log('Based on the test results above:');
    console.log('- If you see "column organization_id does not exist" errors,');
    console.log('  then you need to run the SQL script manually');
    console.log('- If the inserts work, then the columns already exist');
    console.log('\n🎯 Next steps:');
    console.log('1. Run fix-missing-tables.sql in Supabase SQL Editor');
    console.log('2. Or the tables are already ready and we can proceed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
tryAlterTables();