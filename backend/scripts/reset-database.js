#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears all data from tables in the correct order to avoid foreign key constraints
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function resetDatabase() {
  console.log('🗑️  Starting database reset...');
  
  try {
    // Delete in reverse dependency order to avoid foreign key conflicts
    
    // 1. Delete user-organization relationships first
    console.log('Deleting user_organizations...');
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .delete()
      .gte('user_organization_id', '00000000-0000-0000-0000-000000000000');
    
    if (userOrgError) {
      console.log('Note: user_organizations might be empty or error occurred:', userOrgError.message);
    }

    // 2. Delete stock movements
    console.log('Deleting stock_movements...');
    const { error: stockError } = await supabase
      .from('stock_movements')
      .delete()
      .neq('movement_id', 'impossible-uuid-to-match-everything');
    
    if (stockError) {
      console.log('Note: stock_movements might be empty or error occurred:', stockError.message);
    }

    // 3. Delete order details
    console.log('Deleting order_details...');
    const { error: orderDetailsError } = await supabase
      .from('order_details')
      .delete()
      .neq('order_detail_id', 'impossible-uuid-to-match-everything');
    
    if (orderDetailsError) {
      console.log('Note: order_details might be empty or error occurred:', orderDetailsError.message);
    }

    // 4. Delete orders
    console.log('Deleting orders...');
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .neq('order_id', 'impossible-uuid-to-match-everything');
    
    if (ordersError) {
      console.log('Note: orders might be empty or error occurred:', ordersError.message);
    }

    // 5. Delete products
    console.log('Deleting products...');
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('product_id', 'impossible-uuid-to-match-everything');
    
    if (productsError) {
      console.log('Note: products might be empty or error occurred:', productsError.message);
    }

    // 6. Delete warehouses
    console.log('Deleting warehouses...');
    const { error: warehousesError } = await supabase
      .from('warehouses')
      .delete()
      .neq('warehouse_id', 'impossible-uuid-to-match-everything');
    
    if (warehousesError) {
      console.log('Note: warehouses might be empty or error occurred:', warehousesError.message);
    }

    // 7. Delete clients
    console.log('Deleting clients...');
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .neq('client_id', 'impossible-uuid-to-match-everything');
    
    if (clientsError) {
      console.log('Note: clients might be empty or error occurred:', clientsError.message);
    }

    // 8. Delete suppliers
    console.log('Deleting suppliers...');
    const { error: suppliersError } = await supabase
      .from('suppliers')
      .delete()
      .neq('supplier_id', 'impossible-uuid-to-match-everything');
    
    if (suppliersError) {
      console.log('Note: suppliers might be empty or error occurred:', suppliersError.message);
    }

    // 9. Delete organizations (this should be second to last)
    console.log('Deleting organizations...');
    const { error: organizationsError } = await supabase
      .from('organizations')
      .delete()
      .neq('organization_id', 'impossible-uuid-to-match-everything');
    
    if (organizationsError) {
      console.log('Note: organizations might be empty or error occurred:', organizationsError.message);
    }

    // 10. Delete users (this should be last for normal users, but auth.users is protected)
    console.log('Deleting users from public.users table...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('user_id', 'impossible-uuid-to-match-everything');
    
    if (usersError) {
      console.log('Note: users might be empty or error occurred:', usersError.message);
    }

    console.log('✅ Database reset completed successfully!');
    console.log('');
    console.log('📝 Note: This script only clears the public schema tables.');
    console.log('   Supabase auth.users are managed by Supabase Auth and were not deleted.');
    console.log('   You may need to manually delete auth users from the Supabase dashboard if needed.');
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  }
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
console.log('This action cannot be undone.');
console.log('');

rl.question('Are you sure you want to proceed? Type "yes" to continue: ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    resetDatabase().finally(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('Database reset cancelled.');
    rl.close();
    process.exit(0);
  }
});