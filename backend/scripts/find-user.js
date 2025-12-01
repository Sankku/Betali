const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
  // Get user_organizations for Smoke Test Organization
  const { data: userOrgs, error } = await supabase
    .from('user_organizations')
    .select('user_id, role, users(email)')
    .eq('organization_id', 'd4028e30-17b8-484c-857b-26ef5bb3699a');

  console.log('Result:', userOrgs);
  console.log('Error:', error);
}

findUser();
