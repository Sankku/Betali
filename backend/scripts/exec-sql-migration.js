#!/usr/bin/env node
/**
 * Execute SQL migration using pg client
 * This bypasses Supabase JS limitations for raw SQL
 */
const fs = require('fs');
const path = require('path');

async function execMigration() {
  console.log('\n📦 Installing required dependencies...');

  // Check if pg is installed
  try {
    require.resolve('pg');
    console.log('✅ pg package found\n');
  } catch (e) {
    console.log('⚠️  pg package not found, installing...\n');
    const { execSync } = require('child_process');
    try {
      execSync('npm install pg', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('\n✅ pg package installed\n');
    } catch (error) {
      console.error('❌ Failed to install pg package');
      console.log('\nPlease run: npm install pg');
      console.log('Then run this script again.\n');
      process.exit(1);
    }
  }

  const { Client } = require('pg');
  require('dotenv').config();

  // Parse Supabase URL to get database connection details
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

  // Construct the PostgreSQL connection string
  // Note: You'll need your database password from Supabase project settings
  console.log('🔗 Connecting to database...');
  console.log(`   Project: ${projectRef}`);
  console.log('\n⚠️  NOTE: This requires direct database access credentials.');
  console.log('   Get your connection string from:');
  console.log('   https://supabase.com/dashboard/project/' + projectRef + '/settings/database\n');

  // Alternative: Use Supabase connection pooler
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.log('❌ DATABASE_URL not found in .env file\n');
    console.log('Please add DATABASE_URL to your .env file with your Supabase database connection string.\n');
    console.log('Example:');
    console.log('DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.' + projectRef + '.supabase.co:5432/postgres\n');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration: 006_create_stock_reservations_table.sql\n');

    // Execute the SQL
    await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify table was created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'stock_reservations'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: stock_reservations table exists\n');

      // Check functions
      const funcs = await client.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN ('get_reserved_stock', 'get_available_stock')
      `);

      console.log(`✅ Found ${funcs.rows.length} helper functions:`);
      funcs.rows.forEach(row => console.log(`   • ${row.routine_name}()`));
      console.log('');
    } else {
      console.log('⚠️  Table not found after migration\n');
    }

    console.log('🎉 Stock reservation system is ready!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

execMigration();
