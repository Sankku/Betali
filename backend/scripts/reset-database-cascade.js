#!/usr/bin/env node

/**
 * Aggressive Database Reset with TRUNCATE CASCADE
 * Uses raw SQL to forcefully clear all data including foreign key relationships
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// All tables that need to be cleared
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

async function resetDatabaseCascade() {
  console.log('🗑️  Starting aggressive database reset with TRUNCATE CASCADE...');
  
  try {
    // Method 1: Try TRUNCATE CASCADE for each table
    console.log('Method 1: Attempting TRUNCATE CASCADE...');
    
    for (const table of tables) {
      console.log(`Truncating ${table}...`);
      
      try {
        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql: `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`
        });
        
        if (error) {
          console.log(`⚠️  TRUNCATE failed for ${table}:`, error.message);
          
          // Fallback: Try regular DELETE
          console.log(`Trying DELETE for ${table}...`);
          const { error: deleteError, count } = await supabase
            .from(table)
            .delete()
            .gte('created_at', '1900-01-01'); // Match everything with created_at
          
          if (deleteError) {
            // Try alternative delete conditions
            const conditions = [
              ['id', 0],
              ['updated_at', '1900-01-01'],
              ['organization_id', '00000000-0000-0000-0000-000000000000']
            ];
            
            let deleted = false;
            for (const [field, value] of conditions) {
              try {
                const { error: altError, count: altCount } = await supabase
                  .from(table)
                  .delete()
                  .gte(field, value);
                
                if (!altError) {
                  console.log(`✅ Cleared ${altCount || 0} records from ${table} using ${field}`);
                  deleted = true;
                  break;
                }
              } catch (e) {
                // Continue to next condition
              }
            }
            
            if (!deleted) {
              console.log(`❌ Could not clear ${table}:`, deleteError.message);
            }
          } else {
            console.log(`✅ Cleared ${count || 0} records from ${table}`);
          }
        } else {
          console.log(`✅ TRUNCATED ${table} successfully`);
        }
      } catch (tableError) {
        console.log(`⚠️  Table ${table} error:`, tableError.message);
      }
    }

    // Method 2: If TRUNCATE didn't work, try disabling FK constraints
    console.log('\nMethod 2: Attempting to disable FK constraints and delete...');
    
    try {
      // Disable foreign key checks (if supported)
      await supabase.rpc('exec_sql', {
        sql: 'SET session_replication_role = replica;'
      });
      
      // Try to delete from all tables again
      for (const table of tables) {
        try {
          const { error, count } = await supabase
            .from(table)
            .delete()
            .not('created_at', 'is', null);
          
          if (!error) {
            console.log(`✅ FK-disabled delete: ${count || 0} records from ${table}`);
          }
        } catch (e) {
          // Silent fail - table might not exist or be empty
        }
      }
      
      // Re-enable foreign key checks
      await supabase.rpc('exec_sql', {
        sql: 'SET session_replication_role = DEFAULT;'
      });
      
    } catch (fkError) {
      console.log('⚠️  FK constraint manipulation not supported:', fkError.message);
    }

    // Method 3: Nuclear option - try to delete with specific UUIDs
    console.log('\nMethod 3: Nuclear delete approach...');
    
    for (const table of tables) {
      try {
        // Try various delete conditions that should match everything
        const deleteConditions = [
          { field: 'created_at', op: 'gte', value: '1900-01-01T00:00:00Z' },
          { field: 'updated_at', op: 'gte', value: '1900-01-01T00:00:00Z' },
          { field: 'id', op: 'gte', value: 0 }
        ];
        
        for (const condition of deleteConditions) {
          try {
            let query = supabase.from(table).delete();
            
            if (condition.op === 'gte') {
              query = query.gte(condition.field, condition.value);
            }
            
            const { error, count } = await query;
            
            if (!error && count && count > 0) {
              console.log(`✅ Nuclear delete: ${count} records from ${table}`);
              break; // Success, move to next table
            }
          } catch (e) {
            // Try next condition
          }
        }
      } catch (e) {
        // Continue to next table
      }
    }

    console.log('');
    console.log('✅ Aggressive database reset completed!');
    console.log('📝 Note: This script used multiple methods to ensure complete data removal.');
    console.log('   Check the database to verify all test data has been cleared.');
    
  } catch (error) {
    console.error('❌ Error during aggressive database reset:', error);
    process.exit(1);
  }
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will AGGRESSIVELY DELETE ALL DATA from the database!');
console.log('This uses TRUNCATE CASCADE and other forceful methods.');
console.log('This action cannot be undone.');
console.log('');

rl.question('Are you sure you want to proceed? Type "NUKE" to continue: ', (answer) => {
  if (answer === 'NUKE') {
    resetDatabaseCascade().finally(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('Database reset cancelled.');
    rl.close();
    process.exit(0);
  }
});