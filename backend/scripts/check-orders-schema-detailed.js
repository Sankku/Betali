#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkOrdersSchema() {
  console.log('🔍 Detailed Orders Table Schema Analysis\n');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  // Fields that OrderService expects to use
  const expectedFields = [
    'order_id', // Primary key (should be auto-generated UUID)
    'organization_id', // Required
    'client_id', // Nullable FK to clients
    'warehouse_id', // Nullable FK to warehouse
    'user_id', // Required FK to users
    'status', // Required, default 'draft'
    'order_date', // Required timestamp
    'total_price', // Required decimal
    'notes', // Nullable text
    'created_at', // Auto timestamp
    'updated_at' // Auto timestamp
  ];
  
  // PRD suggests these additional fields
  const prdSuggestedFields = [
    'order_number', // Auto-generated unique string (ORD-001, etc.)
    'delivery_date', // Nullable timestamp
    'subtotal', // decimal(10,2)
    'tax_amount', // decimal(10,2)
    'discount_amount', // decimal(10,2) default 0
    'total_amount', // decimal(10,2) - might be same as total_price
    'internal_notes', // text - staff only
    'created_by', // FK to users
  ];
  
  try {
    console.log('📋 Testing field existence...\n');
    
    // Test each expected field
    for (const field of expectedFields) {
      try {
        const { error } = await supabase
          .from('orders')
          .select(field)
          .limit(0);
          
        if (error) {
          console.log(`❌ Missing: ${field} - ${error.message}`);
        } else {
          console.log(`✅ Exists: ${field}`);
        }
      } catch (err) {
        console.log(`❌ Error testing ${field}: ${err.message}`);
      }
    }
    
    console.log('\n📋 Testing PRD suggested fields...\n');
    
    // Test PRD fields
    for (const field of prdSuggestedFields) {
      try {
        const { error } = await supabase
          .from('orders')
          .select(field)
          .limit(0);
          
        if (error) {
          console.log(`⚠️  PRD field missing: ${field}`);
        } else {
          console.log(`✅ PRD field exists: ${field}`);
        }
      } catch (err) {
        console.log(`❌ Error testing PRD field ${field}: ${err.message}`);
      }
    }
    
    console.log('\n🔧 Checking order_details/order_items table...\n');
    
    // Check order details table
    const orderDetailFields = [
      'order_item_id', // or order_detail_id
      'order_id', // FK to orders
      'product_id', // FK to products
      'warehouse_id', // FK to warehouse
      'organization_id', // For multi-tenancy
      'quantity', // decimal(10,3)
      'unit_price', // decimal(10,2)
      'line_total', // quantity * unit_price
      'created_at'
    ];
    
    for (const field of orderDetailFields) {
      try {
        const { error } = await supabase
          .from('order_details')
          .select(field)
          .limit(0);
          
        if (error) {
          console.log(`❌ order_details missing: ${field} - ${error.message}`);
        } else {
          console.log(`✅ order_details has: ${field}`);
        }
      } catch (err) {
        console.log(`❌ Error testing order_details.${field}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Schema analysis error:', error);
  }
}

checkOrdersSchema();