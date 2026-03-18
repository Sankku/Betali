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
  console.log('🚀 Applying Migration 011: Fix advisory lock key in generate_purchase_order_number\n');

  const migrationPath = path.join(__dirname, 'migrations', '011_fix_po_number_lock_key.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.log('⚠️  exec_sql RPC not available. Please execute the following SQL directly in your Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    process.exit(1);
  }

  console.log('✅ Migration 011 applied successfully!');
  console.log('✨ Purchase order creation no longer fails with UUID hex error\n');
}

applyMigration().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
