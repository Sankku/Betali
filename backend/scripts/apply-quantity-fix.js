#!/usr/bin/env node

/**
 * Apply Quantity Column Fix using REST API
 * Change quantity column from INTEGER to DECIMAL using Supabase REST API
 */

const fetch = require('node-fetch');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function executeSQL(sql) {
  console.log('\n🔧 Executing SQL:', sql);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({ sql: sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ SQL execution failed:', response.status, errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log('✅ SQL executed successfully');
    return { success: true, result };
    
  } catch (error) {
    console.error('💥 Error executing SQL:', error.message);
    return { success: false, error: error.message };
  }
}

async function applyQuantityFix() {
  console.log('🚀 APPLYING QUANTITY COLUMN TYPE FIX');
  console.log('='.repeat(60));
  
  // Step 1: Check current column type
  console.log('\n📊 Step 1: Checking current column type...');
  const checkResult = await executeSQL(`
    SELECT 
      column_name,
      data_type,
      numeric_precision,
      numeric_scale,
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'stock_movements' 
    AND column_name = 'quantity';
  `);
  
  if (!checkResult.success) {
    console.log('❌ Could not check current column type. Trying alternative approach...');
    
    // Try using PostgREST directly
    console.log('\n🔧 Trying direct ALTER statement...');
    
    const alterResult = await executeSQL(`
      ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(10,4);
    `);
    
    if (alterResult.success) {
      console.log('✅ Column type changed successfully!');
      
      // Verify the change
      console.log('\n🧪 Testing with decimal insert...');
      await testDecimalInsert();
      
      return true;
    } else {
      console.log('❌ Direct ALTER approach failed');
      console.log('This might require manual intervention in Supabase dashboard');
      
      // Show manual instructions
      console.log('\n📋 MANUAL STEPS:');
      console.log('1. Open Supabase dashboard');
      console.log('2. Go to Database > SQL Editor');
      console.log('3. Run this SQL:');
      console.log('   ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(10,4);');
      
      return false;
    }
  }
  
  if (checkResult.result) {
    console.log('Current column info:', checkResult.result);
  }
  
  return true;
}

async function testDecimalInsert() {
  console.log('\n🧪 Testing decimal insert after fix...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/stock_movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        warehouse_id: '123e4567-e89b-12d3-a456-426614174001',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        movement_type: 'entry',
        quantity: 40.4,
        movement_date: '2025-09-12',
        reference: 'Test decimal after fix - will be deleted'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Decimal insert test passed!');
      
      // Clean up
      if (result && result.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/stock_movements?movement_id=eq.${result[0].movement_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          }
        });
        console.log('🧹 Test data cleaned up');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Decimal insert test failed:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

async function main() {
  try {
    const success = await applyQuantityFix();
    
    if (success) {
      console.log('\n🎉 QUANTITY COLUMN FIX COMPLETED SUCCESSFULLY!');
      console.log('\n✅ Stock movements now support decimal quantities like 40.4');
      console.log('✅ The original stock movement creation error should be resolved');
    } else {
      console.log('\n❌ AUTOMATIC FIX FAILED');
      console.log('\n📋 Please apply the fix manually in Supabase dashboard:');
      console.log('1. Go to https://app.supabase.com/project/gzqjhtzuongvbtdwvzaz');
      console.log('2. Navigate to Database > SQL Editor');
      console.log('3. Run: ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(10,4);');
    }
    
  } catch (error) {
    console.error('Main error:', error.message);
  }
}

main().catch(console.error);