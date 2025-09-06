#!/usr/bin/env node

/**
 * Final Database Reset - Handle specific FK constraints
 * Clear warehouse table first, then organizations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function finalReset() {
  console.log('🗑️  Starting final database reset...');
  
  try {
    // Step 1: Clear warehouse table first (it references organizations)
    console.log('Step 1: Clearing warehouse table...');
    const { error: warehouseError, count: warehouseCount } = await supabase
      .from('warehouse')
      .delete()
      .gte('created_at', '1900-01-01');
    
    if (warehouseError) {
      console.log('❌ Warehouse delete error:', warehouseError.message);
    } else {
      console.log(`✅ Cleared ${warehouseCount || 0} warehouse records`);
    }

    // Step 2: Clear other dependent tables
    const dependentTables = [
      'user_organizations',
      'stock_movements', 
      'order_details',
      'orders',
      'applied_discounts',
      'customer_pricing',
      'products',
      'clients',
      'suppliers',
      'tax_rates',
      'discount_rules',
      'pricing_tiers',
      'product_tax_groups'
    ];
    
    console.log('\nStep 2: Clearing dependent tables...');
    for (const table of dependentTables) {
      console.log(`Clearing ${table}...`);
      
      try {
        const { error, count } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1900-01-01');
        
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.log(`⚠️  ${table}:`, error.message);
        } else if (count !== null) {
          console.log(`✅ Cleared ${count} records from ${table}`);
        } else {
          console.log(`✅ Cleared ${table} (table exists)`);
        }
      } catch (err) {
        if (!err.message.includes('does not exist')) {
          console.log(`⚠️  ${table}:`, err.message);
        }
      }
    }

    // Step 3: Clear organizations (should work now)
    console.log('\nStep 3: Clearing organizations...');
    const { error: orgError, count: orgCount } = await supabase
      .from('organizations')
      .delete()
      .gte('created_at', '1900-01-01');
    
    if (orgError) {
      console.log('❌ Organizations delete error:', orgError.message);
    } else {
      console.log(`✅ Cleared ${orgCount || 0} organization records`);
    }

    // Step 4: Clear users
    console.log('\nStep 4: Clearing users...');
    const { error: userError, count: userCount } = await supabase
      .from('users')
      .delete()
      .gte('created_at', '1900-01-01');
    
    if (userError) {
      console.log('❌ Users delete error:', userError.message);
    } else {
      console.log(`✅ Cleared ${userCount || 0} user records`);
    }

    console.log('');
    console.log('✅ Final database reset completed!');
    console.log('📝 All test data should now be cleared.');
    
  } catch (error) {
    console.error('❌ Error during final database reset:', error);
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

rl.question('Are you sure you want to proceed? Type "DELETE" to continue: ', (answer) => {
  if (answer === 'DELETE') {
    finalReset().finally(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('Database reset cancelled.');
    rl.close();
    process.exit(0);
  }
});