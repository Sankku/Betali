const supabase = require('../lib/supabaseClient');

async function checkConstraint() {
  try {
    console.log('🔍 Checking order status constraint...');
    
    // Check if we have any orders currently
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status')
      .limit(10);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      console.log(`Found ${orders?.length || 0} orders`);
      if (orders && orders.length > 0) {
        console.log('Current statuses:', orders.map(o => o.status));
      }
    }

    // Try to insert a test order with 'pending' status to see if it fails
    console.log('🧪 Testing order creation with "pending" status...');
    
    const testOrder = {
      organization_id: '52989a6e-a2ea-4653-a94e-9adb300648a0', // Use your org ID
      status: 'pending',
      total_price: 10.00,
      order_date: new Date().toISOString()
    };

    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating order:', createError);
      console.log('Error details:', JSON.stringify(createError, null, 2));
      
      // If it's a constraint error, let's try different status values
      if (createError.message.includes('check constraint')) {
        console.log('🔍 Testing other status values...');
        
        const statusesToTest = ['draft', 'confirmed', 'active', 'open', 'new'];
        
        for (const status of statusesToTest) {
          console.log(`Testing status: "${status}"`);
          const { error: testError } = await supabase
            .from('orders')
            .insert([{ ...testOrder, status }])
            .select()
            .single();
          
          if (testError) {
            console.log(`  ❌ Failed: ${testError.message}`);
          } else {
            console.log(`  ✅ Success with status: "${status}"`);
            // Clean up the test order
            await supabase.from('orders').delete().eq('status', status);
            break;
          }
        }
      }
    } else {
      console.log('✅ Successfully created order with "pending" status');
      console.log('Order ID:', newOrder.order_id);
      
      // Clean up the test order
      await supabase.from('orders').delete().eq('order_id', newOrder.order_id);
      console.log('🗑️ Cleaned up test order');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkConstraint();