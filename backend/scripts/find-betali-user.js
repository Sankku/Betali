const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findBetaliUser() {
  // Find user by email
  const { data: users } = await supabase
    .from('users')
    .select('user_id, email')
    .eq('email', 'betali.business@gmail.com')
    .single();

  if (!users) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ Found user:', users.email);
  console.log('   User ID:', users.user_id);
  console.log('');

  // Get organizations for this user
  const { data: orgs } = await supabase
    .from('user_organizations')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', users.user_id);

  console.log('Organizations:');
  for (const org of orgs || []) {
    console.log(`- ${org.organizations.name} (${org.role})`);
    console.log(`  ID: ${org.organization_id}`);
    console.log('');
  }
}

findBetaliUser();
