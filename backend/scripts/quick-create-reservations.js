/**
 * Quick script to create stock_reservations table directly
 * Uses Supabase REST API to execute SQL
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Read the migration file
const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('\n🚀 Creating stock_reservations table...\n');
console.log('📄 Migration file loaded:', migrationPath);
console.log('📏 SQL length:', sql.length, 'characters\n');

// Parse Supabase URL to get project ref
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('🔗 Project:', projectRef);
console.log('🌐 URL:', SUPABASE_URL);
console.log('\n⚠️  NOTE: Supabase JS client cannot execute raw SQL directly.');
console.log('\n📋 You have 3 options:\n');

console.log('Option 1: Supabase SQL Editor (RECOMMENDED)');
console.log('  1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('  2. Copy the contents of: ' + migrationPath);
console.log('  3. Paste and click "Run"\n');

console.log('Option 2: Use psql command');
console.log('  Get your database password from: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
console.log('  Then run:');
console.log('  psql "postgresql://postgres:[YOUR-PASSWORD]@db.' + projectRef + '.supabase.co:5432/postgres" -f ' + migrationPath + '\n');

console.log('Option 3: Copy SQL directly');
console.log('  I can show you the first few lines of SQL to verify it\'s correct:\n');

// Show first 20 lines
const lines = sql.split('\n').slice(0, 20);
console.log('─'.repeat(60));
lines.forEach((line, i) => {
  console.log(`${String(i + 1).padStart(3)}: ${line}`);
});
console.log('─'.repeat(60));
console.log(`... (${sql.split('\n').length - 20} more lines)\n`);

console.log('💡 TIP: The file contains everything needed:');
console.log('   • CREATE TABLE stock_reservations');
console.log('   • Indexes for performance');
console.log('   • Functions: get_reserved_stock(), get_available_stock()');
console.log('   • Triggers for auto-updates');
console.log('   • RLS policies for security\n');

console.log('Once you\'ve run the migration, test it with:');
console.log('  node backend/scripts/test-stock-reservations.js\n');
