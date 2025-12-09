/**
 * Apply stock_reservations table migration
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  console.log('\n🚀 Applying Stock Reservations Migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded\n');
  console.log('⚠️  IMPORTANT: This requires direct PostgreSQL access.\n');
  console.log('Since Supabase JS client cannot execute raw SQL, you have two options:\n');
  console.log('Option 1 (Recommended): Use Supabase SQL Editor');
  console.log('  1. Go to: https://gzqjhtzuongvbtdwvzaz.supabase.co/project/default/sql');
  console.log('  2. Click "+ New query"');
  console.log(`  3. Copy and paste the contents of: ${migrationPath}`);
  console.log('  4. Click "Run" to execute\n');

  console.log('Option 2: Use psql command line');
  console.log(`  psql <your-connection-string> -f ${migrationPath}\n`);

  console.log('📋 Migration Summary:');
  console.log('   • Creates stock_reservations table');
  console.log('   • Adds get_reserved_stock() function');
  console.log('   • Adds get_available_stock() function');
  console.log('   • Sets up RLS policies');
  console.log('   • Creates performance indexes\n');

  // Try to check if it already exists
  try {
    const { data, error } = await supabase
      .from('stock_reservations')
      .select('reservation_id')
      .limit(1);

    if (!error) {
      console.log('✅ Good news! The stock_reservations table already exists!\n');
      return true;
    } else if (error.message.includes('does not exist')) {
      console.log('❌ Table does not exist yet. Please apply the migration using one of the options above.\n');
      return false;
    } else {
      console.log('⚠️  Cannot verify table existence:', error.message, '\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking table:', error.message, '\n');
    return false;
  }
}

applyMigration().then(success => {
  if (success) {
    console.log('🎉 Ready to use stock reservations!\n');
    process.exit(0);
  } else {
    console.log('⏳ Waiting for migration to be applied...\n');
    process.exit(1);
  }
});
