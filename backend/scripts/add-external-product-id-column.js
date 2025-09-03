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

async function addExternalProductIdColumn() {
  console.log('🔄 Starting external_product_id column migration...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add-external-product-id-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL migration to execute:');
    console.log(sql);
    
    // Check if external_product_id column exists
    console.log('🔍 Checking if external_product_id column exists...');
    
    // Try to select from products table with external_product_id column
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('external_product_id')
      .limit(1);
    
    if (testError && testError.message.includes('column "external_product_id" does not exist')) {
      console.log('❌ external_product_id column does not exist in products table');
      console.log('📝 Manual migration required:');
      console.log('Please execute the following SQL in your Supabase dashboard:');
      console.log('----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------');
      console.log('⚠️  This column is required for the application to work properly');
      process.exit(1);
    } else if (testError) {
      console.error('❌ Error checking table:', testError);
      process.exit(1);
    } else {
      console.log('✅ external_product_id column already exists!');
    }
    
    console.log('✅ Migration check completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration check
addExternalProductIdColumn();