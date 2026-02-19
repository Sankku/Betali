#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

async function runMigration() {
  console.log('🚀 Applying Migration 008: Order Status Triggers...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '008_add_order_status_triggers.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comment-only lines
      if (statement.trim().startsWith('--')) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        throw error;
      }
    }

    console.log('\n✅ Migration 008 applied successfully!');
    console.log('✨ Order status triggers are now active');
    console.log('\nTrigger created:');
    console.log('  - trg_order_status_change: Manages stock when order status changes');
    console.log('\nFunctions created:');
    console.log('  - get_order_organization_id(): Gets org ID from order');
    console.log('  - handle_order_status_change(): Handles all status transitions\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual execution required:');
    console.log('Please run the SQL from: backend/scripts/migrations/008_add_order_status_triggers.sql');
    console.log('in your Supabase SQL Editor\n');
    process.exit(1);
  }
}

runMigration();
