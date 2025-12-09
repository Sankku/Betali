/**
 * Script to verify Purchase Orders tables were created successfully
 *
 * Usage: node scripts/verify-purchase-orders-tables.js
 */

const { supabase } = require('../config/supabase');

async function verifyTables() {
  console.log('🔍 Verifying Purchase Orders tables...\n');

  try {
    // Check suppliers table
    console.log('1. Checking suppliers table...');
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('count')
      .limit(0);

    if (suppliersError) {
      console.log('   ❌ suppliers table NOT found');
      console.log('   Error:', suppliersError.message);
    } else {
      console.log('   ✅ suppliers table exists');
    }

    // Check purchase_orders table
    console.log('2. Checking purchase_orders table...');
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select('count')
      .limit(0);

    if (poError) {
      console.log('   ❌ purchase_orders table NOT found');
      console.log('   Error:', poError.message);
    } else {
      console.log('   ✅ purchase_orders table exists');
    }

    // Check purchase_order_details table
    console.log('3. Checking purchase_order_details table...');
    const { data: poDetails, error: detailsError } = await supabase
      .from('purchase_order_details')
      .select('count')
      .limit(0);

    if (detailsError) {
      console.log('   ❌ purchase_order_details table NOT found');
      console.log('   Error:', detailsError.message);
    } else {
      console.log('   ✅ purchase_order_details table exists');
    }

    console.log('\n📊 Verification Summary:');
    const allTablesExist = !suppliersError && !poError && !detailsError;

    if (allTablesExist) {
      console.log('✅ All tables created successfully!');
      console.log('\nYou can now proceed with:');
      console.log('  - Creating repositories');
      console.log('  - Creating services');
      console.log('  - Creating controllers');
    } else {
      console.log('❌ Some tables are missing. Please run the migration first.');
      console.log('\nRun: node scripts/apply-purchase-orders-migration.js');
    }

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  }
}

verifyTables();
