require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('products').select('*').limit(1).maybeSingle();
  
  if (data) {
    console.log('Products columns:', Object.keys(data));
    console.log('\nSample:', JSON.stringify(data, null, 2));
  } else if (error) {
    console.error('Error:', error);
  }
}

checkSchema();
