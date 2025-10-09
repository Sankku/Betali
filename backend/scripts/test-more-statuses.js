const supabase = require('../lib/supabaseClient');

async function testMoreStatuses() {
  try {
    console.log('🧪 Testing more status values...');
    
    // Test more variations that might be allowed
    const statusesToTest = [
      'pending', 'processing', 'shipped', 'completed', 'cancelled', // Our expected values
      'draft', // Try again
      'PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', // Uppercase
      'Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled' // Title case
    ];
    
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

testMoreStatuses();