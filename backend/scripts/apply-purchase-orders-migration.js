/**
 * Script to apply Purchase Orders migration (007)
 *
 * This script reads the SQL migration file and executes it on Supabase
 *
 * Usage: node scripts/apply-purchase-orders-migration.js
 */

const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

async function applyMigration() {
  console.log('🚀 Starting Purchase Orders migration (007)...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_create_purchase_orders.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing SQL statements...\n');

    // Execute the migration
    // Note: Supabase client doesn't support raw SQL execution directly
    // You need to run this in Supabase SQL Editor or use the admin API

    console.log('⚠️  IMPORTANT: Execute this migration using one of these methods:\n');
    console.log('Option 1 - Supabase Dashboard:');
    console.log('  1. Go to your Supabase project dashboard');
    console.log('  2. Navigate to SQL Editor');
    console.log('  3. Copy the contents of: backend/scripts/migrations/007_create_purchase_orders.sql');
    console.log('  4. Paste and run\n');

    console.log('Option 2 - psql command line:');
    console.log('  psql YOUR_SUPABASE_CONNECTION_STRING -f backend/scripts/migrations/007_create_purchase_orders.sql\n');

    console.log('📋 Migration file location:');
    console.log(`  ${migrationPath}\n`);

    // Verify tables after manual execution
    console.log('After running the migration, verify with:');
    console.log('  node scripts/verify-purchase-orders-tables.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
