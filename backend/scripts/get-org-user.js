const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrgUser() {
  // Get the organization
  const { data: org } = await supabase
    .from('organizations')
    .select('organization_id, name')
    .eq('name', 'Smoke Test Organization')
    .single();

  if (!org) {
    console.log('Organization not found');
    return;
  }

  console.log('Organization:', org.name);
  console.log('ID:', org.organization_id);
  console.log('');

  // Get users in this organization
  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('user_id, role')
    .eq('organization_id', org.organization_id);

  if (!userOrgs || userOrgs.length === 0) {
    console.log('No users found in this organization');
    return;
  }

  console.log('Users in this organization:');
  for (const userOrg of userOrgs) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userOrg.user_id);
    if (authUser && authUser.user) {
      console.log(`- Email: ${authUser.user.email}`);
      console.log(`  Role: ${userOrg.role}`);
      console.log(`  User ID: ${userOrg.user_id}`);
      console.log('');
    }
  }
}

getOrgUser();
