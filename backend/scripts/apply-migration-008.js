const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying Migration 008: Order Status Triggers...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '008_add_order_status_triggers.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not available, executing directly via SQL editor...');
      console.log('\n📋 Please execute the following SQL in your Supabase SQL Editor:\n');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('=' .repeat(80));
      console.log('\nOr run: psql <connection-string> < backend/scripts/migrations/008_add_order_status_triggers.sql\n');
      process.exit(1);
    }

    console.log('✅ Migration 008 applied successfully!');
    console.log('✨ Order status triggers are now active\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
