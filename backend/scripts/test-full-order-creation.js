const supabase = require('../lib/supabaseClient');

async function testFullOrderCreation() {
  try {
    console.log('🧪 Testing full order creation with all fields...');
    
    // Create test data similar to what OrderService would send
    const organizationId = '52989a6e-a2ea-4653-a94e-9adb300648a0';
    const now = new Date().toISOString();
    
    const orderData = {
      organization_id: organizationId,
      client_id: null,
      warehouse_id: null,
      user_id: '4ef37216-5711-403a-96e9-5a2fdd286d85', // Your user ID from logs
      status: 'pending',
      order_date: now,
      subtotal: 40.30,
      discount_amount: 0,
      tax_amount: 8.46,
      total_price: 48.76,
      total: 48.76,
      notes: null,
      order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now
    };

    console.log('Order data to insert:', JSON.stringify(orderData, null, 2));

    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating order:', createError);
      console.log('Error code:', createError.code);
      console.log('Error details:', createError.details);
      console.log('Error hint:', createError.hint);
      console.log('Full error:', JSON.stringify(createError, null, 2));
    } else {
      console.log('✅ Successfully created order with full data');
      console.log('Order ID:', newOrder.order_id);
      console.log('Order status:', newOrder.status);
      
      // Clean up the test order
      await supabase.from('orders').delete().eq('order_id', newOrder.order_id);
      console.log('🗑️ Cleaned up test order');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFullOrderCreation();