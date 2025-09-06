#!/usr/bin/env node

/**
 * Simple Database Reset Script
 * Clears all data using TRUNCATE CASCADE (most effective)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const tables = [
  'organizations',
  'user_organizations', 
  'users',
  'products',
  'warehouses',
  'stock_movements',
  'orders',
  'order_details',
  'clients',
  'suppliers',
  'tax_rates',
  'pricing_tiers',
  'customer_pricing',
  'discount_rules',
  'applied_discounts',
  'product_tax_groups'
];

async function resetDatabase() {
  console.log('🗑️  Starting simple database reset...');
  
  try {
    // Try to delete all records from each table
    for (const table of tables) {
      console.log(`Clearing ${table}...`);
      
      try {
        // Use RPC to execute raw SQL for better control
        const { error } = await supabase.rpc('exec_sql', {
          sql: `DELETE FROM ${table};`
        });
        
        if (error) {
          // If RPC doesn't work, try regular delete with a condition that matches all
          console.log(`RPC failed for ${table}, trying regular delete...`);
          const { error: deleteError, count } = await supabase
            .from(table)
            .delete()
            .not('created_at', 'is', null); // This should match most records
            
          if (deleteError) {
            console.log(`❌ Could not clear ${table}:`, deleteError.message);
          } else {
            console.log(`✅ Cleared ${count || 0} records from ${table}`);
          }
        } else {
          console.log(`✅ Cleared ${table} using SQL`);
        }
      } catch (tableError) {
        console.log(`⚠️  Table ${table} might not exist or is protected:`, tableError.message);
      }
    }

    console.log('');
    console.log('✅ Database reset attempt completed!');
    console.log('📝 Note: Some tables might be protected by RLS policies.');
    console.log('   Check Supabase dashboard to verify the reset was successful.');
    
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