const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugOrganizationState() {
  console.log('🔍 Debugging organization state...\n');
  
  try {
    // 1. Check organizations table
    console.log('1️⃣ Organizations in database:');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('organization_id, name, slug, owner_user_id')
      .order('name');
    
    if (orgsError) throw orgsError;
    
    orgs.forEach(org => {
      console.log(`   - ${org.name}: ID=${org.organization_id}, Owner=${org.owner_user_id ? '✅' : '❌'}`);
    });
    
    // 2. Check user_organizations relationships
    console.log('\n2️⃣ User-Organization relationships:');
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        organization_id, 
        role,
        is_active,
        organizations(name, slug)
      `)
      .eq('is_active', true)
      .order('user_id');
    
    if (userOrgsError) throw userOrgsError;
    
    userOrgs.forEach(rel => {
      console.log(`   - User ${rel.user_id} -> ${rel.organizations.name} as ${rel.role}`);
    });
    
    // 3. Test the API endpoint logic
    console.log('\n3️⃣ Testing getUserOrganizations query:');
    const testUserId = '4ef37216-5711-403a-96e9-5a2fdd286d85';
    
    const { data: testResult, error: testError } = await supabase
      .from('user_organizations')
      .select(`
        *,
        organization:organizations(*),
        branch:branches(*)
      `)
      .eq('user_id', testUserId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });
    
    if (testError) throw testError;
    
    console.log(`   Found ${testResult.length} organizations for user ${testUserId}:`);
    testResult.forEach(rel => {
      console.log(`   - Organization: ${rel.organization?.name || 'NULL'}`);
      console.log(`     ID: ${rel.organization?.organization_id || 'NULL'}`);
      console.log(`     Role: ${rel.role}`);
      console.log(`     Permissions: ${JSON.stringify(rel.permissions)}`);
      console.log('     ---');
    });
    
    // 4. Check for data inconsistencies
    console.log('\n4️⃣ Checking for inconsistencies:');
    let hasIssues = false;
    
    // Check for organizations without owner_user_id
    const orphanedOrgs = orgs.filter(org => !org.owner_user_id);
    if (orphanedOrgs.length > 0) {
      console.log(`   ❌ Found ${orphanedOrgs.length} organizations without owner_user_id`);
      hasIssues = true;
    }
    
    // Check for user_organizations without matching organizations
    for (const userOrg of userOrgs) {
      if (!userOrg.organizations) {
        console.log(`   ❌ user_organizations entry ${userOrg.user_id} -> ${userOrg.organization_id} has no organization data`);
        hasIssues = true;
      }
    }
    
    if (!hasIssues) {
      console.log('   ✅ No inconsistencies found');
    }
    
    console.log('\n5️⃣ Expected API response format:');
    const expectedFormat = testResult.map(userOrg => ({
      user_organization_id: userOrg.user_organization_id,
      user_id: userOrg.user_id,
      organization_id: userOrg.organization_id,
      branch_id: userOrg.branch_id,
      role: userOrg.role,
      permissions: userOrg.permissions,
      is_active: userOrg.is_active,
      joined_at: userOrg.joined_at,
      organization: userOrg.organization,
      branch: userOrg.branch,
      userRole: userOrg.role,
      userPermissions: userOrg.permissions,
      joinedAt: userOrg.joined_at,
      userOrganizationId: userOrg.user_organization_id
    }));
    
    console.log('Expected response structure:');
    console.log(JSON.stringify(expectedFormat, null, 2));
    
  } catch (error) {
    console.error('💥 Error debugging organization state:', error);
  }
}

// Run the debug
debugOrganizationState();