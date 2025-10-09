const supabase = require('../lib/supabaseClient');

async function fixConstraintDirect() {
  try {
    console.log('🔧 Attempting to fix orders status constraint directly...');
    
    // First, let's try to get the current constraint definition using a SQL function
    console.log('🔍 Checking current constraint...');
    
    // Since we can't run DDL directly through Supabase client,
    // let's try a different approach: temporarily set status to a known working value
    
    // Test 1: Try to insert with the most basic possible status
    console.log('🧪 Testing with status: "draft"...');
    const testData1 = {
      organization_id: '52989a6e-a2ea-4653-a94e-9adb300648a0',
      status: 'draft',
      total_price: 1.00,
      order_date: new Date().toISOString()
    };
    
    const { data: result1, error: error1 } = await supabase
      .from('orders')
      .insert([testData1])
      .select()
      .single();
    
    if (error1) {
      console.log('❌ "draft" failed:', error1.message);
    } else {
      console.log('✅ "draft" worked! Cleaning up...');
      await supabase.from('orders').delete().eq('order_id', result1.order_id);
    }

    // Test 2: Try different status values that might be in the constraint
    const statusesToTest = [
      'active', 'inactive', 'confirmed', 'open', 'closed', 'new', 'submitted',
      'approved', 'rejected', 'in_progress', 'done', 'completed', 'cancelled'
    ];
    
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
        // Clean up the test order
        await supabase.from('orders').delete().eq('order_id', result.order_id);
        console.log(`  🧹 Cleaned up test order for "${status}"`);
        break; // Found a working status, we can stop here
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixConstraintDirect();