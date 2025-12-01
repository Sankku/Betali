const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listOrgs() {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('organization_id, name')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Recent organizations:\n');
  for (const org of orgs || []) {
    const { data: userOrgs } = await supabase
      .from('user_organizations')
      .select('user_id, role, users(email)')
      .eq('organization_id', org.organization_id)
      .limit(1)
      .single();

    console.log(`📦 ${org.name}`);
    if (userOrgs) {
      console.log(`   User: ${userOrgs.users?.email || 'N/A'} (${userOrgs.role})`);
    }
    console.log('');
  }
}

listOrgs();
