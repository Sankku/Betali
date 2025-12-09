/**
 * Simple verification script
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  console.log('\n🔍 Verifying stock_reservations table...\n');
  console.log('Using:', process.env.SUPABASE_URL);
  console.log('Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'Present' : 'Missing');

  // Try different approaches

  // Approach 1: Direct query with service role
  console.log('\n1️⃣  Trying direct table query...');
  const { data: d1, error: e1 } = await supabase
    .from('stock_reservations')
    .select('count')
    .limit(1);

  if (e1) {
    console.log('❌ Error:', e1.message);
    console.log('   Code:', e1.code);
    console.log('   Details:', e1.details);
  } else {
    console.log('✅ Table accessible!');
  }

  // Approach 2: Check using information_schema
  console.log('\n2️⃣  Checking information_schema...');
  const { data: d2, error: e2 } = await supabase
    .rpc('exec_sql', {
      query: `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'stock_reservations'
      );`
    });

  if (e2) {
    console.log('⚠️  exec_sql not available:', e2.message);
  } else {
    console.log('✅ Result:', d2);
  }

  // Approach 3: Try to call the function
  console.log('\n3️⃣  Testing get_available_stock function...');
  const { data: d3, error: e3 } = await supabase
    .rpc('get_available_stock', {
      p_product_id: '00000000-0000-0000-0000-000000000000',
      p_warehouse_id: '00000000-0000-0000-0000-000000000000',
      p_organization_id: '00000000-0000-0000-0000-000000000000'
    });

  if (e3) {
    console.log('❌ Function error:', e3.message);
  } else {
    console.log('✅ Function exists! Result:', d3);
  }

  // Approach 4: List all tables
  console.log('\n4️⃣  Listing all tables...');
  const { data: d4, error: e4 } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (e4) {
    console.log('⚠️  Cannot list tables:', e4.message);
  } else {
    console.log('✅ Found tables:', d4?.slice(0, 10).map(t => t.table_name));
  }

  console.log('\n');
}

verify().catch(console.error);
