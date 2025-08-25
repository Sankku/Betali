const { DatabaseConfig } = require('../config/database');

/**
 * Simple migration using Supabase JavaScript client
 * This avoids SQL execution issues and uses direct table operations
 */
async function runSimpleMigration() {
  console.log('🚀 Starting Simple SaaS Migration...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Step 1: Check current state
    console.log('📊 Step 1: Checking current state...');
    
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*');
    
    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }
    
    console.log(`   Found ${organizations.length} organizations`);
    
    const { data: userOrgs, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('*');
    
    if (userOrgError) {
      throw new Error(`Failed to fetch user organizations: ${userOrgError.message}`);
    }
    
    console.log(`   Found ${userOrgs.length} user-organization relationships`);
    
    // Step 2: Update user_organizations roles to new system
    console.log('\n🔄 Step 2: Updating user-organization roles...');
    
    // Find users who should be owners (first users in each organization)
    const organizationOwners = new Map();
    
    organizations.forEach(org => {
      const orgUsers = userOrgs.filter(uo => uo.organization_id === org.organization_id);
      if (orgUsers.length > 0) {
        // Make the first user the owner
        organizationOwners.set(org.organization_id, orgUsers[0].user_id);
      }
    });
    
    // Update roles: super_admin → owner for org owners, admin for others
    for (const userOrg of userOrgs) {
      let newRole = userOrg.role;
      
      if (userOrg.role === 'super_admin') {
        const isOwner = organizationOwners.get(userOrg.organization_id) === userOrg.user_id;
        newRole = isOwner ? 'owner' : 'admin';
        
        console.log(`   Updating user ${userOrg.user_id} in org ${userOrg.organization_id}: ${userOrg.role} → ${newRole}`);
        
        const { error: updateError } = await supabase
          .from('user_organizations')
          .update({ role: newRole })
          .eq('user_organization_id', userOrg.user_organization_id);
        
        if (updateError) {
          console.error(`   ❌ Failed to update role: ${updateError.message}`);
        } else {
          console.log(`   ✅ Role updated successfully`);
        }
      }
    }
    
    // Step 3: Check if we can use raw SQL for adding columns
    console.log('\n🔧 Step 3: Attempting to add organization ownership...');
    
    // We can't easily add columns via the JS client, so let's check what we can do
    // Let's see if the organizations table already has owner_user_id
    const { data: orgSample, error: orgSampleError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (!orgSampleError && orgSample.length > 0) {
      const hasOwnerField = orgSample[0].hasOwnProperty('owner_user_id');
      console.log(`   Organizations table ${hasOwnerField ? 'already has' : 'needs'} owner_user_id field`);
      
      if (hasOwnerField) {
        // Update existing organizations with their owners
        for (const [orgId, ownerId] of organizationOwners) {
          console.log(`   Setting owner for organization ${orgId}: ${ownerId}`);
          
          const { error: ownerUpdateError } = await supabase
            .from('organizations')
            .update({ owner_user_id: ownerId })
            .eq('organization_id', orgId);
          
          if (ownerUpdateError) {
            console.error(`   ❌ Failed to set owner: ${ownerUpdateError.message}`);
          } else {
            console.log(`   ✅ Owner set successfully`);
          }
        }
      }
    }
    
    // Step 4: Check business tables for organization_id
    console.log('\n🏭 Step 4: Checking business tables...');
    
    const businessTables = ['products', 'warehouse', 'stock_movements', 'clients', 'orders'];
    const tableStatus = {};
    
    for (const table of businessTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error && data) {
          const hasOrgId = data.length > 0 && data[0].hasOwnProperty('organization_id');
          tableStatus[table] = hasOrgId ? 'HAS_ORG_ID' : 'MISSING_ORG_ID';
          console.log(`   ${table}: ${tableStatus[table]}`);
          
          // If missing organization_id and has data, we need manual migration
          if (!hasOrgId && data.length > 0) {
            console.log(`   ⚠️  ${table} needs organization_id column added via SQL`);
          }
        }
      } catch (err) {
        tableStatus[table] = 'ERROR';
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
    // Step 5: Final verification
    console.log('\n🔍 Step 5: Final verification...');
    
    const { data: finalUserOrgs, error: finalError } = await supabase
      .from('user_organizations')
      .select('role');
    
    if (!finalError) {
      const roleDistribution = {};
      finalUserOrgs.forEach(uo => {
        roleDistribution[uo.role] = (roleDistribution[uo.role] || 0) + 1;
      });
      console.log('   Role distribution:', roleDistribution);
    }
    
    console.log('\n📋 Migration Summary:');
    console.log('✅ User roles updated to new system');
    console.log('✅ Organization ownership logic implemented');
    console.log('📝 Manual SQL needed for:');
    
    Object.entries(tableStatus).forEach(([table, status]) => {
      if (status === 'MISSING_ORG_ID') {
        console.log(`   - Add organization_id to ${table} table`);
      }
    });
    
    console.log('\n🎯 Next steps:');
    console.log('1. Run manual SQL for missing organization_id columns');
    console.log('2. Update frontend to use new role system');
    console.log('3. Test multi-tenant functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runSimpleMigration();