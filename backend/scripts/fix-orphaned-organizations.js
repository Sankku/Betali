const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixOrphanedOrganizations() {
  console.log('🔧 Fixing orphaned organizations...');
  
  try {
    // 1. Get all organizations without owner_user_id
    const { data: orphanedOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .is('owner_user_id', null);
    
    if (orgsError) {
      throw orgsError;
    }
    
    console.log(`Found ${orphanedOrgs.length} orphaned organizations:`, 
      orphanedOrgs.map(org => `${org.name} (${org.organization_id})`));
    
    if (orphanedOrgs.length === 0) {
      console.log('✅ No orphaned organizations found');
      return;
    }
    
    // 2. Get the main user (first user from FACYT S.A.)
    const mainUserId = '4ef37216-5711-403a-96e9-5a2fdd286d85';
    
    console.log(`Using main user ID: ${mainUserId}`);
    
    // 3. For each orphaned organization, assign owner and create user_organizations relationship
    for (const org of orphanedOrgs) {
      console.log(`\n🔨 Fixing organization: ${org.name}`);
      
      // Set owner_user_id
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          owner_user_id: mainUserId,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', org.organization_id);
      
      if (updateError) {
        console.error(`❌ Error updating organization ${org.name}:`, updateError);
        continue;
      }
      
      // Create user_organizations relationship
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: mainUserId,
          organization_id: org.organization_id,
          role: 'super_admin',
          permissions: ['*'],
          is_active: true,
          joined_at: new Date().toISOString()
        });
      
      if (userOrgError) {
        console.error(`❌ Error creating user_organizations for ${org.name}:`, userOrgError);
        continue;
      }
      
      console.log(`✅ Fixed organization: ${org.name}`);
    }
    
    console.log('\n🎉 All orphaned organizations have been fixed!');
    
    // 4. Show final status
    const { data: allOrgs, error: finalError } = await supabase
      .from('organizations')
      .select('name, owner_user_id')
      .order('name');
    
    if (!finalError) {
      console.log('\n📊 Final organizations status:');
      allOrgs.forEach(org => {
        console.log(`  - ${org.name}: ${org.owner_user_id ? '✅ Has owner' : '❌ No owner'}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error fixing orphaned organizations:', error);
  }
}

// Run the fix
fixOrphanedOrganizations();