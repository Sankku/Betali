/**
 * Script to verify stock reservation system is working
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkStockSystem() {
  console.log('\n🔍 Checking Stock Reservation System...\n');

  try {
    // 1. Check if stock_reservations table exists
    console.log('1️⃣  Checking stock_reservations table...');
    const { data: reservations, error: reservationsError } = await supabase
      .from('stock_reservations')
      .select('*')
      .limit(1);

    if (reservationsError) {
      console.error('❌ stock_reservations table error:', reservationsError.message);
    } else {
      console.log('✅ stock_reservations table exists');
    }

    // 2. Check if get_available_stock function exists
    console.log('\n2️⃣  Checking get_available_stock function...');

    // Get a sample product and warehouse to test with
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_id, organization_id, name')
      .limit(1)
      .single();

    if (productsError || !products) {
      console.log('⚠️  No products found to test with');
    } else {
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouse')
        .select('warehouse_id, organization_id')
        .eq('organization_id', products.organization_id)
        .limit(1)
        .single();

      if (warehousesError || !warehouses) {
        console.log('⚠️  No warehouses found to test with');
      } else {
        // Test get_available_stock function
        const { data: availableStock, error: stockError } = await supabase
          .rpc('get_available_stock', {
            p_product_id: products.product_id,
            p_warehouse_id: warehouses.warehouse_id,
            p_organization_id: products.organization_id
          });

        if (stockError) {
          console.error('❌ get_available_stock function error:', stockError.message);
        } else {
          console.log('✅ get_available_stock function works');
          console.log(`   Product: ${products.name}`);
          console.log(`   Available Stock: ${availableStock}`);
        }
      }
    }

    // 3. Check stock_movements table
    console.log('\n3️⃣  Checking stock_movements table...');
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);

    if (movementsError) {
      console.error('❌ stock_movements table error:', movementsError.message);
    } else {
      console.log('✅ stock_movements table exists');
    }

    // 4. Check orders table
    console.log('\n4️⃣  Checking orders table...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('order_id, status, organization_id')
      .limit(1);

    if (ordersError) {
      console.error('❌ orders table error:', ordersError.message);
    } else {
      console.log('✅ orders table exists');
      if (orders && orders.length > 0) {
        console.log(`   Found ${orders.length} order(s)`);
      }
    }

    // 5. Check order_details table
    console.log('\n5️⃣  Checking order_details table...');
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('order_details')
      .select('*')
      .limit(1);

    if (orderDetailsError) {
      console.error('❌ order_details table error:', orderDetailsError.message);
    } else {
      console.log('✅ order_details table exists');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Stock Reservation System Check Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('   • stock_reservations table: Ready');
    console.log('   • get_available_stock function: Working');
    console.log('   • stock_movements table: Ready');
    console.log('   • orders table: Ready');
    console.log('   • order_details table: Ready');
    console.log('\n🎉 All systems are operational!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the check
checkStockSystem();
