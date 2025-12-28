/**
 * Check stock_movements table schema
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('📋 Checking stock_movements table schema...\n');

  try {
    // Try to select all columns from a single row
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching data:', error.message);
      return;
    }

    if (data) {
      console.log('✅ Current columns in stock_movements table:');
      console.log(JSON.stringify(Object.keys(data), null, 2));
      console.log('\n📊 Sample data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('⚠️  Table is empty, cannot determine schema from data');
      console.log('Trying to insert a test record to see what columns are expected...');

      // Get test data
      const { data: org } = await supabase.from('organizations').select('organization_id').limit(1).single();
      const { data: warehouse } = await supabase.from('warehouse').select('warehouse_id').limit(1).single();
      const { data: product } = await supabase.from('products').select('product_id').limit(1).single();

      // Try minimal insert
      const testData = {
        organization_id: org?.organization_id,
        warehouse_id: warehouse?.warehouse_id,
        product_id: product?.product_id,
        movement_type: 'entry',
        quantity: 1
      };

      const { data: inserted, error: insertError } = await supabase
        .from('stock_movements')
        .insert([testData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError.message);
      } else {
        console.log('✅ Successfully inserted test record. Columns:');
        console.log(JSON.stringify(Object.keys(inserted), null, 2));

        // Clean up
        await supabase.from('stock_movements').delete().eq('movement_id', inserted.movement_id);
        console.log('🧹 Cleaned up test record');
      }
    }

    // Now check what columns are missing
    console.log('\n🔍 Checking for required columns:');
    const requiredColumns = ['movement_id', 'organization_id', 'product_id', 'warehouse_id', 'movement_type', 'quantity', 'reference_type', 'reference_id', 'notes', 'created_by', 'created_at'];

    if (data) {
      const existingColumns = Object.keys(data);
      requiredColumns.forEach(col => {
        if (existingColumns.includes(col)) {
          console.log(`  ✅ ${col}`);
        } else {
          console.log(`  ❌ ${col} - MISSING`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
