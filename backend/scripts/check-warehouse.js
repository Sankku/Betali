#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkWarehouse() {
  console.log('Checking warehouse table...');
  
  try {
    const { data, error } = await supabase
      .from('warehouse')
      .select('*')
      .limit(10);
    
    if (error) {
      console.log('Warehouse Error:', error.message);
    } else {
      console.log('Warehouse records found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Warehouse sample:', data.slice(0, 3));
      }
    }
  } catch (err) {
    console.log('Warehouse table error:', err.message);
  }

  // Also check warehouses (plural)
  console.log('\nChecking warehouses table...');
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .limit(10);
    
    if (error) {
      console.log('Warehouses Error:', error.message);
    } else {
      console.log('Warehouses records found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Warehouses sample:', data.slice(0, 3));
      }
    }
  } catch (err) {
    console.log('Warehouses table error:', err.message);
  }
}

checkWarehouse().then(() => process.exit(0));