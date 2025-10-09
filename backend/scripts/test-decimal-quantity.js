#!/usr/bin/env node

/**
 * Test Decimal Quantity Insert
 * Try to insert a record with decimal quantity to see exactly where the error occurs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testDecimalQuantityInsert() {
  console.log('🧪 TESTING DECIMAL QUANTITY INSERT');
  console.log('='.repeat(50));
  
  try {
    // First, let's check if there are any existing records to get valid IDs
    console.log('\n📊 Checking existing records for valid IDs...');
    
    const { data: products } = await supabase
      .from('products')
      .select('product_id')
      .limit(1);
      
    const { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id')
      .limit(1);
      
    const { data: organizations } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1);
    
    if (!products || products.length === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    if (!warehouses || warehouses.length === 0) {
      console.log('❌ No warehouses found in database');
      return;
    }
    
    if (!organizations || organizations.length === 0) {
      console.log('❌ No organizations found in database');
      return;
    }
    
    console.log('✅ Found valid IDs for testing');
    
    // Try to insert a test record with decimal quantity
    const testData = {
      product_id: products[0].product_id,
      warehouse_id: warehouses[0].warehouse_id,
      organization_id: organizations[0].organization_id,
      movement_type: 'entry',
      quantity: 40.4, // This is the decimal value that caused the error
      movement_date: new Date().toISOString().split('T')[0],
      reference: 'Test decimal quantity - will be deleted'
    };
    
    console.log('\n🚀 Attempting to insert record with decimal quantity...');
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('\n❌ INSERT FAILED');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
      
      // Check if it's specifically about the quantity field
      if (error.message.includes('quantity') || error.message.includes('integer')) {
        console.log('\n🔍 CONFIRMED: The error is related to quantity field type');
        console.log('The database quantity column is likely defined as INTEGER');
        return { success: false, reason: 'quantity_type_mismatch' };
      } else {
        console.log('\n🔍 The error is not related to quantity field type');
        return { success: false, reason: 'other_error', details: error };
      }
      
    } else {
      console.log('\n✅ INSERT SUCCEEDED');
      console.log('Inserted data:', JSON.stringify(data, null, 2));
      
      // Clean up test data
      if (data && data[0]) {
        console.log('\n🧹 Cleaning up test data...');
        const { error: deleteError } = await supabase
          .from('stock_movements')
          .delete()
          .eq('movement_id', data[0].movement_id);
          
        if (deleteError) {
          console.log('⚠️ Warning: Could not delete test record:', deleteError.message);
        } else {
          console.log('✅ Test data cleaned up successfully');
        }
      }
      
      return { success: true };
    }
    
  } catch (error) {
    console.error('\n💥 UNEXPECTED ERROR:', error.message);
    return { success: false, reason: 'unexpected_error', details: error };
  }
}

async function testIntegerQuantityInsert() {
  console.log('\n\n🧪 TESTING INTEGER QUANTITY INSERT (FOR COMPARISON)');
  console.log('='.repeat(50));
  
  try {
    const { data: products } = await supabase
      .from('products')
      .select('product_id')
      .limit(1);
      
    const { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id')
      .limit(1);
      
    const { data: organizations } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1);
    
    if (!products?.length || !warehouses?.length || !organizations?.length) {
      console.log('❌ Missing required reference data');
      return;
    }
    
    // Try with integer quantity
    const testData = {
      product_id: products[0].product_id,
      warehouse_id: warehouses[0].warehouse_id,
      organization_id: organizations[0].organization_id,
      movement_type: 'entry',
      quantity: 40, // Integer value
      movement_date: new Date().toISOString().split('T')[0],
      reference: 'Test integer quantity - will be deleted'
    };
    
    console.log('\n🚀 Attempting to insert record with integer quantity...');
    
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('\n❌ INTEGER INSERT ALSO FAILED');
      console.log('Error:', error.message);
      return { success: false, details: error };
    } else {
      console.log('\n✅ INTEGER INSERT SUCCEEDED');
      
      // Clean up
      if (data && data[0]) {
        await supabase
          .from('stock_movements')
          .delete()
          .eq('movement_id', data[0].movement_id);
        console.log('🧹 Integer test data cleaned up');
      }
      
      return { success: true };
    }
    
  } catch (error) {
    console.error('\n💥 INTEGER TEST ERROR:', error.message);
    return { success: false };
  }
}

async function main() {
  try {
    console.log('🔬 DECIMAL QUANTITY DIAGNOSTIC TEST');
    console.log('='.repeat(60));
    
    // Test decimal quantity first
    const decimalResult = await testDecimalQuantityInsert();
    
    // Test integer quantity for comparison
    const integerResult = await testIntegerQuantityInsert();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(30));
    console.log(`Decimal quantity (40.4): ${decimalResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Integer quantity (40): ${integerResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (!decimalResult.success && integerResult.success) {
      console.log('\n🎯 DIAGNOSIS: Database column type needs to be changed from INTEGER to DECIMAL');
      console.log('\n💡 SOLUTION:');
      console.log('1. Run the SQL migration to change column type:');
      console.log('   ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(10,4);');
      console.log('2. Or update the frontend validation to only allow whole numbers');
    } else if (!decimalResult.success && !integerResult.success) {
      console.log('\n🎯 DIAGNOSIS: The issue is not related to quantity field type');
      console.log('There may be other validation or constraint issues');
    } else if (decimalResult.success) {
      console.log('\n🎯 DIAGNOSIS: Database already accepts decimal quantities');
      console.log('The issue may be elsewhere in the application flow');
    }
    
  } catch (error) {
    console.error('Main error:', error.message);
  }
}

main().catch(console.error);