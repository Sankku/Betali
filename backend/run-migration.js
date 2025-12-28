require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📦 Running migration: add_created_by_to_stock_movements.sql');
    
    const sql = fs.readFileSync('./migrations/add_created_by_to_stock_movements.sql', 'utf8');
    
    // Execute migration using Supabase SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      // Try alternative approach: using raw SQL through REST API
      console.log('\n🔄 Trying alternative approach...');
      console.log('Please run this SQL manually in Supabase SQL Editor:');
      console.log('\n' + sql);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.log('./migrations/add_created_by_to_stock_movements.sql');
    process.exit(1);
  }
}

runMigration();
