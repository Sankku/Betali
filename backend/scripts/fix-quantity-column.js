#!/usr/bin/env node

/**
 * Fix Stock Movements Quantity Column Type
 * Change quantity from INTEGER to DECIMAL to support fractional quantities
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkQuantityColumnType() {
  console.log('🔍 CHECKING QUANTITY COLUMN TYPE');
  console.log('='.repeat(50));
  
  try {
    // Query the information schema to get column details
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name,
            data_type,
            numeric_precision,
            numeric_scale,
            is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'stock_movements' 
          AND column_name = 'quantity';
        `
      });
    
    if (error) {
      console.log('❌ Error checking column type:', error.message);
      
      // Alternative approach using a direct query
      console.log('\n🔍 Trying alternative approach...');
      const { data: altData, error: altError } = await supabase
        .from('stock_movements')
        .select('quantity')
        .limit(1);
        
      if (altError && altError.message.includes('integer')) {
        console.log('✅ Confirmed: quantity column is INTEGER type');
        console.log('Error message:', altError.message);
        return 'integer';
      }
    } else if (data && data.length > 0) {
      console.log('✅ Column type information:');
      console.log(JSON.stringify(data[0], null, 2));
      return data[0].data_type;
    }
    
    return 'unknown';
    
  } catch (error) {
    console.error('💥 Error checking column type:', error.message);
    return 'unknown';
  }
}

async function fixQuantityColumn() {
  console.log('\n🔧 FIXING QUANTITY COLUMN TYPE');
  console.log('='.repeat(50));
  
  try {
    // First, let's try to alter the column type
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `ALTER TABLE stock_movements ALTER COLUMN quantity TYPE DECIMAL(10,4);`
      });
    
    if (error) {
      console.log('❌ Direct ALTER failed:', error.message);
      
      // If direct alter fails, we might need to use a different approach
      console.log('\n🔍 Trying alternative approach with type casting...');
      
      const { data: altData, error: altError } = await supabase
        .rpc('exec_sql', {
          sql: `
            -- First backup existing data if any
            CREATE TABLE IF NOT EXISTS stock_movements_backup AS 
            SELECT * FROM stock_movements;
            
            -- Drop and recreate the column
            ALTER TABLE stock_movements DROP COLUMN quantity;
            ALTER TABLE stock_movements ADD COLUMN quantity DECIMAL(10,4) NOT NULL DEFAULT 0;
            
            -- Restore data if backup exists
            UPDATE stock_movements 
            SET quantity = stock_movements_backup.quantity::DECIMAL(10,4)
            FROM stock_movements_backup 
            WHERE stock_movements.movement_id = stock_movements_backup.movement_id;
            
            -- Clean up backup
            DROP TABLE IF EXISTS stock_movements_backup;
          `
        });
        
      if (altError) {
        console.log('❌ Alternative approach failed:', altError.message);
        return false;
      } else {
        console.log('✅ Alternative approach succeeded');
      }
    } else {
      console.log('✅ Direct ALTER succeeded');
    }
    
    // Verify the change
    console.log('\n🔍 Verifying the change...');
    const currentType = await checkQuantityColumnType();
    console.log(`Current quantity column type: ${currentType}`);
    
    return true;
    
  } catch (error) {
    console.error('💥 Error fixing column type:', error.message);
    return false;
  }
}

async function testDecimalInsert() {
  console.log('\n🧪 TESTING DECIMAL INSERT');
  console.log('='.repeat(50));
  
  try {
    // Try to insert a test record with decimal quantity
    const testData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000', // dummy UUID
      warehouse_id: '123e4567-e89b-12d3-a456-426614174001', // dummy UUID
      organization_id: '123e4567-e89b-12d3-a456-426614174002', // dummy UUID
      movement_type: 'entry',
      quantity: 40.4,
      movement_date: new Date().toISOString().split('T')[0],
      reference: 'Test decimal quantity'
    };
    
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('❌ Test insert failed:', error.message);
      if (error.message.includes('integer')) {
        console.log('🔍 Confirmed: Column still expects integer values');
        return false;
      }
    } else {
      console.log('✅ Test insert succeeded!');
      console.log('Inserted data:', data);
      
      // Clean up test data
      if (data && data[0]) {
        await supabase
          .from('stock_movements')
          .delete()
          .eq('movement_id', data[0].movement_id);
        console.log('🧹 Cleaned up test data');
      }
      return true;
    }
    
  } catch (error) {
    console.error('💥 Error testing insert:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 STARTING QUANTITY COLUMN TYPE FIX');
    console.log('='.repeat(60));
    
    // Check current type
    const currentType = await checkQuantityColumnType();
    console.log(`\n📊 Current quantity column type: ${currentType}`);
    
    if (currentType === 'integer' || currentType === 'unknown') {
      console.log('\n⚠️  Column needs to be fixed to accept decimal values');
      
      // Fix the column
      const fixed = await fixQuantityColumn();
      
      if (fixed) {
        // Test with decimal values
        const testPassed = await testDecimalInsert();
        
        if (testPassed) {
          console.log('\n🎉 SUCCESS: Quantity column now accepts decimal values!');
        } else {
          console.log('\n❌ FAILURE: Column fix did not work as expected');
        }
      }
    } else {
      console.log('\n✅ Column type is already suitable for decimal values');
      
      // Still test to make sure it works
      const testPassed = await testDecimalInsert();
      if (testPassed) {
        console.log('\n✅ Decimal insert test passed');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);