const supabase = require('../lib/supabaseClient');
const fs = require('fs');
const path = require('path');

async function updateOrderStatusConstraint() {
  try {
    console.log('🔄 Updating order status constraint...');
    
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'update-order-status-constraint.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error updating constraint:', error);
      
      // If the RPC doesn't exist, try executing the SQL commands individually
      console.log('🔄 Trying alternative approach...');
      
      // Drop existing constraint
      const { error: dropError } = await supabase
        .from('orders')
        .select('*')
        .limit(0); // This will fail if constraint is blocking, but that's expected
      
      console.log('📝 You need to run this SQL in Supabase SQL Editor:');
      console.log('```sql');
      console.log(sql);
      console.log('```');
      
      return;
    }
    
    console.log('✅ Order status constraint updated successfully!');
    
    // Test the new constraint with all status values
    console.log('\n🧪 Testing new status values...');
    
    const statusesToTest = ['draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
    const workingStatuses = [];
    
    for (const status of statusesToTest) {
      console.log(`🧪 Testing status: "${status}"`);
      const testData = {
        organization_id: '52989a6e-a2ea-4653-a94e-9adb300648a0',
        status: status,
        total_price: 1.00,
        order_date: new Date().toISOString()
      };
      
      const { data: result, error } = await supabase
        .from('orders')
        .insert([testData])
        .select()
        .single();
      
      if (error) {
        console.log(`  ❌ "${status}" failed: ${error.message}`);
      } else {
        console.log(`  ✅ "${status}" SUCCESS!`);
        workingStatuses.push(status);
        // Clean up the test order
        await supabase.from('orders').delete().eq('order_id', result.order_id);
      }
    }

    console.log('\n📊 SUMMARY - Working status values:');
    if (workingStatuses.length > 0) {
      workingStatuses.forEach(status => console.log(`  ✅ "${status}"`));
    } else {
      console.log('  ❌ No working status values found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateOrderStatusConstraint();