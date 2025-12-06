#!/usr/bin/env node

/**
 * Display Stock Reservations Migration SQL
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, 'migrations', '006_create_stock_reservations_table.sql');

console.log('\n📝 Stock Reservations Migration Instructions\n');
console.log('='.repeat(80));
console.log('MANUAL MIGRATION REQUIRED');
console.log('='.repeat(80));
console.log('\nPlease follow these steps:\n');
console.log('1. Go to your Supabase Dashboard SQL Editor:');
console.log('   https://gzqjhtzuongvbtdwvzaz.supabase.co/project/_/sql\n');
console.log('2. Create a new query\n');
console.log('3. Copy and paste the SQL below\n');
console.log('4. Click "Run" to execute\n');
console.log('5. Verify success message\n');

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('='.repeat(80));
console.log('COPY THIS SQL:');
console.log('='.repeat(80));
console.log(migrationSQL);
console.log('='.repeat(80));

console.log('\n✅ After running the migration, you can test with:');
console.log('   bun run back (start the backend server)');
console.log('   Test the stock reservation endpoints\n');
