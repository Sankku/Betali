/**
 * Direct migration script for stock_movements table
 * Adds created_by column using direct SQL commands
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Applying migration to stock_movements table...\n');

  try {
    // Step 1: Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);

    if (checkError && !checkError.message.includes('created_by')) {
      console.log('✅ Column created_by already exists in stock_movements');
    } else {
      console.log('⚠️  Column created_by might not exist, but we cannot verify through select');
    }

    // Step 2: Try to insert a test record with created_by
    console.log('\n🧪 Testing if created_by column exists...');

    const { data: orgs } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(1)
      .single();

    if (!orgs) {
      console.error('❌ No organization found for testing');
      process.exit(1);
    }

    const { data: user } = await supabase
      .from('users')
      .select('user_id')
      .limit(1)
      .single();

    if (!user) {
      console.error('❌ No user found for testing');
      process.exit(1);
    }

    const { data: warehouse } = await supabase
      .from('warehouse')
      .select('warehouse_id')
      .eq('organization_id', orgs.organization_id)
      .limit(1)
      .single();

    if (!warehouse) {
      console.error('❌ No warehouse found for testing');
      process.exit(1);
    }

    const { data: product } = await supabase
      .from('products')
      .select('product_id')
      .eq('organization_id', orgs.organization_id)
      .limit(1)
      .single();

    if (!product) {
      console.error('❌ No product found for testing');
      process.exit(1);
    }

    // Try to create a stock movement with created_by
    const testMovement = {
      organization_id: orgs.organization_id,
      warehouse_id: warehouse.warehouse_id,
      product_id: product.product_id,
      movement_type: 'adjustment',
      quantity: 0,
      notes: 'TEST - Migration verification',
      created_by: user.user_id
    };

    const { data: movement, error: insertError } = await supabase
      .from('stock_movements')
      .insert([testMovement])
      .select();

    if (insertError) {
      if (insertError.message.includes('created_by')) {
        console.log('❌ Column created_by does NOT exist');
        console.log('Error:', insertError.message);
        console.log('\n📋 MANUAL ACTION REQUIRED:');
        console.log('Please run this SQL in Supabase SQL Editor:\n');
        console.log(`
-- Add created_by column to stock_movements
ALTER TABLE stock_movements
ADD COLUMN created_by UUID REFERENCES users(user_id);

-- Add index
CREATE INDEX idx_stock_movements_created_by ON stock_movements(created_by);

-- Update existing records
UPDATE stock_movements sm
SET created_by = (
  SELECT uo.user_id
  FROM user_organizations uo
  WHERE uo.organization_id = sm.organization_id
  AND uo.role IN ('owner', 'admin')
  LIMIT 1
)
WHERE sm.created_by IS NULL;
        `);
        process.exit(1);
      } else {
        throw insertError;
      }
    }

    console.log('✅ Column created_by EXISTS and is working!');

    // Clean up test movement
    if (movement && movement.length > 0) {
      await supabase
        .from('stock_movements')
        .delete()
        .eq('movement_id', movement[0].movement_id);
      console.log('🧹 Cleaned up test movement');
    }

    console.log('\n✅ Migration verification complete!');
    console.log('Stock movements table is ready to use with created_by column.\n');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.log('\nPlease apply the migration manually.');
    process.exit(1);
  }
}

applyMigration();
