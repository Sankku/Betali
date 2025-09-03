#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

async function applyOrdersSchemaFix() {
  console.log('🔧 Applying Critical Orders Schema Migration...\n');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'fix-orders-schema-critical.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL migration to execute:');
    console.log('=====================================');
    console.log(sql);
    console.log('=====================================\n');
    
    // Test which fields are missing before migration
    console.log('🔍 Checking current schema state...\n');
    
    const fieldsToCheck = [
      { table: 'orders', field: 'notes' },
      { table: 'orders', field: 'order_number' },
      { table: 'orders', field: 'delivery_date' },
      { table: 'orders', field: 'created_by' },
      { table: 'order_details', field: 'order_item_id' },
      { table: 'order_details', field: 'warehouse_id' },
      { table: 'order_details', field: 'unit_price' },
      { table: 'order_details', field: 'line_total' }
    ];
    
    const missingFields = [];
    
    for (const { table, field } of fieldsToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select(field)
          .limit(0);
          
        if (error && error.message.includes('does not exist')) {
          console.log(`❌ ${table}.${field} - MISSING`);
          missingFields.push(`${table}.${field}`);
        } else {
          console.log(`✅ ${table}.${field} - EXISTS`);
        }
      } catch (err) {
        console.log(`❌ ${table}.${field} - ERROR: ${err.message}`);
        missingFields.push(`${table}.${field}`);
      }
    }
    
    if (missingFields.length === 0) {
      console.log('\n🎉 All required fields already exist! No migration needed.');
      return;
    }
    
    console.log(`\n⚠️  Found ${missingFields.length} missing fields:`, missingFields.join(', '));
    console.log('\n📝 Manual migration required:');
    console.log('Please execute the following SQL in your Supabase dashboard:');
    console.log('\n' + '='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    console.log('\n✅ After running the migration, the orders system should work properly!');
    console.log('🧪 You can then test with: node scripts/test-inventory-validation.js');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration
applyOrdersSchemaFix();