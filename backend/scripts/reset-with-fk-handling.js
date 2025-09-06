#!/usr/bin/env node

/**
 * Database Reset with Foreign Key Handling
 * Handles circular foreign key dependencies properly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function resetDatabase() {
  console.log('🗑️  Starting database reset with FK handling...');
  
  try {
    // Step 1: Break circular FK relationships first
    console.log('Step 1: Breaking circular foreign key relationships...');
    
    // Remove organization references from users
    console.log('Removing organization_id from users...');
    const { error: updateUsersError } = await supabase
      .from('users')
      .update({ organization_id: null })
      .not('user_id', 'is', null);
    
    if (updateUsersError && !updateUsersError.message.includes('relation')) {
      console.log('Note:', updateUsersError.message);
    }
    
    // Remove owner references from organizations
    console.log('Removing owner_user_id from organizations...');
    const { error: updateOrgsError } = await supabase
      .from('organizations')
      .update({ owner_user_id: null })
      .not('organization_id', 'is', null);
    
    if (updateOrgsError && !updateOrgsError.message.includes('relation')) {
      console.log('Note:', updateOrgsError.message);
    }
    
    // Step 2: Delete dependent records first
    console.log('\nStep 2: Deleting dependent records...');
    
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
    
    for (const table of dependentTables) {
      console.log(`Deleting from ${table}...`);
      try {
        const { error, count } = await supabase
          .from(table)
          .delete()
          .not('created_at', 'is', null);
        
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation')) {
            console.log(`⚠️  Table ${table} does not exist`);
          } else if (error.message.includes('created_at')) {
            // Try without created_at filter for tables that don't have it
            const { error: altError, count: altCount } = await supabase
              .from(table)
              .delete()
              .gte('id', 0); // Try with a different condition
            
            if (altError) {
              console.log(`❌ ${table}:`, altError.message);
            } else {
              console.log(`✅ Cleared ${altCount || 0} records from ${table}`);
            }
          } else {
            console.log(`❌ ${table}:`, error.message);
          }
        } else {
          console.log(`✅ Cleared ${count || 0} records from ${table}`);
        }
      } catch (err) {
        console.log(`⚠️  ${table}:`, err.message);
      }
    }
    
    // Step 3: Delete main entities
    console.log('\nStep 3: Deleting main entities...');
    
    // Delete organizations
    console.log('Deleting organizations...');
    try {
      const { error: orgError, count: orgCount } = await supabase
        .from('organizations')
        .delete()
        .not('organization_id', 'is', null);
      
      if (orgError) {
        console.log(`❌ organizations:`, orgError.message);
      } else {
        console.log(`✅ Cleared ${orgCount || 0} organizations`);
      }
    } catch (err) {
      console.log(`⚠️  organizations:`, err.message);
    }
    
    // Delete users from public.users table (not auth.users)
    console.log('Deleting from public.users...');
    try {
      const { error: userError, count: userCount } = await supabase
        .from('users')
        .delete()
        .not('user_id', 'is', null);
      
      if (userError) {
        console.log(`❌ users:`, userError.message);
      } else {
        console.log(`✅ Cleared ${userCount || 0} users from public.users`);
      }
    } catch (err) {
      console.log(`⚠️  users:`, err.message);
    }

    console.log('');
    console.log('✅ Database reset completed!');
    console.log('📝 Note: Supabase auth.users are managed by Auth and were not affected.');
    console.log('   The application will recreate user records on next login.');
    
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