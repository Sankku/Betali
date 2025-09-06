#!/usr/bin/env node

/**
 * Check Stock Movements Table Schema
 * Inspect the actual database schema for stock_movements
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkStockMovementsSchema() {
  console.log('🔍 CHECKING STOCK_MOVEMENTS TABLE SCHEMA');
  console.log('='.repeat(50));
  
  try {
    // Try a simple select to see what we can actually query first
    console.log('\n📊 Testing actual data structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);
    
    if (!sampleError) {
      console.log('✅ Sample query successful');
      if (sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        console.log(`\n✅ Found ${columns.length} columns in stock_movements table:`);
        console.log('='.repeat(60));
        
        columns.forEach((col, index) => {
          console.log(`${index + 1}. ${col}`);
        });
        
        // Check if notes column exists
        const hasNotesColumn = columns.includes('notes');
        console.log(`\n🔍 Notes column exists: ${hasNotesColumn ? '✅ YES' : '❌ NO'}`);
        
      } else {
        console.log('📝 Table is empty, let\'s try to get schema a different way...');
        
        // Try with a simple insert to see what columns are expected
        console.log('\n🔍 Attempting to understand table structure...');
        const { error: insertError } = await supabase
          .from('stock_movements')
          .insert({})
          .select();
          
        if (insertError) {
          console.log('Schema hints from insert error:', insertError.message);
        }
      }
    } else {
      console.log('❌ Sample query failed:', sampleError.message);
      return;
    }
    
    // Show recommended columns for stock movements
    console.log('\n📋 RECOMMENDED COLUMNS FOR STOCK MOVEMENTS:');
    const recommendedColumns = [
      'movement_id',
      'product_id', 
      'warehouse_id',
      'organization_id',
      'movement_type',
      'quantity',
      'reference',
      'notes', // ← This might be missing
      'movement_date',
      'created_at',
      'updated_at'
    ];
    
    console.log('\n🔍 Checking which recommended columns might be missing...');
    
  } catch (error) {
    console.error('💥 Schema check crashed:', error.message);
  }
}

async function main() {
  try {
    await checkStockMovementsSchema();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);