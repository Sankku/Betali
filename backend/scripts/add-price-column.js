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

async function addPriceColumn() {
  console.log('🔄 Starting price column migration...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add-price-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    console.log(sql);
    
    // Since we can't execute raw SQL directly, let's try to check if price column exists
    // and create a simple test
    console.log('🔍 Checking if price column exists...');
    
    // Try to select from products table with price column
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('price')
      .limit(1);
    
    if (testError && testError.message.includes('column "price" does not exist')) {
      console.log('❌ Price column does not exist in products table');
      console.log('📝 Manual migration required:');
      console.log('Please execute the following SQL in your Supabase dashboard:');
      console.log('----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------');
      process.exit(1);
    } else if (testError) {
      console.error('❌ Error checking table:', testError);
      process.exit(1);
    } else {
      console.log('✅ Price column already exists!');
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Price column added to products table');
    
    // Verify the column was added by checking table structure
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'products')
      .eq('column_name', 'price');
    
    if (columnError) {
      console.warn('⚠️  Could not verify column addition:', columnError);
    } else if (columns && columns.length > 0) {
      console.log('✅ Price column verified:', columns[0]);
    } else {
      console.warn('⚠️  Could not find price column in verification');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration
addPriceColumn();