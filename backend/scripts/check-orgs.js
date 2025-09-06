const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkOrgs() {
  console.log('Checking organizations...');
  const { data, error } = await supabase
    .from('organizations')
    .select('*');
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Organizations found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Organizations:', data);
    }
  }
  
  // Also check users
  console.log('\nChecking users...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*');
  
  if (userError) {
    console.log('User Error:', userError.message);
  } else {
    console.log('Users found:', users?.length || 0);
    if (users && users.length > 0) {
      console.log('Users:', users);
    }
  }
}

checkOrgs().then(() => process.exit(0));