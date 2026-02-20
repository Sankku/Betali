const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data: orgs } = await supabase.from('organizations').select('*');
  const { data: users } = await supabase.from('users').select('*');
  const { data: userOrgs } = await supabase.from('user_organizations').select('*');
  console.log("Users:", users.length);
  console.log("Orgs:", orgs.length);
  console.log("User Orgs Relations:", userOrgs.map(uo => ({ user: uo.user_id, org: uo.organization_id, role: uo.role })));
  
  if (users.length > 0 && userOrgs.length > 0) {
    const userId0 = userOrgs[0].user_id;
    const { data: testEq } = await supabase.from('user_organizations').select('*').eq('user_id', userId0);
    console.log(`Eq filter for user 0 returned ${testEq.length} records`);
  }
}
run();
