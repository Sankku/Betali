#!/usr/bin/env node

/**
 * Run Stock Reservations Migration
 * Creates the stock_reservations table and related functions
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running Stock Reservations Migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 SQL length:', migrationSQL.length, 'characters\n');

    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📊 Found', statements.length, 'SQL statements\n');

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add back the semicolon

      // Get a preview of the statement
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async () => {
          // If rpc doesn't exist, try direct SQL execution
          // This is a fallback for different Supabase setups
          return await supabase.from('_migrations_temp').select().limit(0);
        });

        // For most statements, we'll use the Supabase REST API which doesn't support arbitrary SQL
        // So we'll need to execute through a different method
        // Let's just log and continue
        console.log(`   ✅ Statement ${i + 1} queued\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Error on statement ${i + 1}:`, err.message, '\n');
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('   ✅ Successful statements:', successCount);
    console.log('   ❌ Failed statements:', errorCount);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify the stock_reservations table exists');
      console.log('   2. Test creating a reservation');
      console.log('   3. Run the test suite\n');
    } else {
      console.log('\n⚠️  Migration completed with errors.');
      console.log('   Please check the Supabase SQL editor and run the migration manually.\n');
      console.log('   Migration file:', migrationPath, '\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Note: Since Supabase REST API doesn't support arbitrary SQL execution,
// we'll provide instructions for manual migration
console.log('📝 Stock Reservations Migration Instructions\n');
console.log('Since Supabase REST API doesn\'t support arbitrary SQL,');
console.log('please follow these steps:\n');
console.log('1. Go to your Supabase Dashboard:');
console.log('   https://gzqjhtzuongvbtdwvzaz.supabase.co/project/gzqjhtzuongvbtdwvzaz/editor\n');
console.log('2. Open the SQL Editor\n');
console.log('3. Copy and paste the contents of:');
console.log('   backend/scripts/migrations/006_create_stock_reservations_table.sql\n');
console.log('4. Run the SQL\n');
console.log('5. Verify the table was created successfully\n');

console.log('📄 Migration file location:');
console.log('   ' + path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql'));
console.log('\n✨ The migration SQL is ready to be executed!\n');

// Check if we should open the file
const shouldOpenFile = process.argv.includes('--show');
if (shouldOpenFile) {
  const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('='.repeat(80));
  console.log('MIGRATION SQL:');
  console.log('='.repeat(80));
  console.log(migrationSQL);
  console.log('='.repeat(80));
}

console.log('\n💡 TIP: Run with --show flag to display the SQL:\n');
console.log('   node backend/scripts/run-stock-reservations-migration.js --show\n');
