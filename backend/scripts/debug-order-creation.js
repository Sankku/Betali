#!/usr/bin/env node

require('dotenv').config();
const { container } = require('../config/container');

async function debugOrderCreation() {
  console.log('🔍 Debugging Order Creation\n');
  
  const orderRepository = container.get('orderRepository');
  const organizationId = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4';
  
  try {
    console.log('📋 Step 1: Testing direct repository create...');
    
    // Create minimal order data that should work
    const minimalOrder = {
      organization_id: organizationId,
      user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259', // Valid user_id from DB
      status: 'draft',
      order_date: new Date().toISOString(),
      total_price: 100.00,
      notes: 'Debug test order'
    };
    
    console.log('Creating order with data:', JSON.stringify(minimalOrder, null, 2));
    
    const result = await orderRepository.create(minimalOrder);
    
    console.log('✅ SUCCESS: Order created successfully!');
    console.log('Created order:', JSON.stringify(result, null, 2));
    
    // Check what was actually stored
    console.log('\n🔍 Step 2: Retrieving created order...');
    const retrieved = await orderRepository.findById(result.order_id, organizationId);
    console.log('Retrieved order:', JSON.stringify(retrieved, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Error details:', error);
    
    // Let's try to understand what went wrong
    console.log('\n🔍 Attempting to debug the error...');
    
    // Check if the table accepts the data types we're sending
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    try {
      // Try minimal insert directly
      console.log('🧪 Testing direct Supabase insert...');
      const { data, error } = await supabase
        .from('orders')
        .insert({
          organization_id: organizationId,
          user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259',
          status: 'draft',
          order_date: new Date().toISOString(),
          total_price: 100.00,
          notes: 'Direct test'
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Direct insert error:', error);
      } else {
        console.log('✅ Direct insert SUCCESS:', data);
      }
    } catch (directError) {
      console.error('❌ Direct insert exception:', directError);
    }
  }
}

debugOrderCreation();