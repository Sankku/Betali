const { DatabaseConfig } = require('../config/database');

/**
 * Script to fix user-organization roles to match the roles in users table
 */
async function fixUserOrganizationRoles() {
  console.log('🔧 Fixing user-organization roles to match users table...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Get all users with their roles from users table
    console.log('📋 Fetching users and their roles from users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, email, name, role')
      .not('role', 'is', null);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📊 Found ${users.length} users with roles`);
    
    // Get user-organization relationships
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, role');
    
    if (userOrgsError) {
      console.error('❌ Error fetching user-organizations:', userOrgsError);
      return;
    }
    
    console.log(`📊 Found ${userOrgs.length} user-organization relationships`);
    
    // Find mismatched roles
    const mismatches = [];
    
    for (const userOrg of userOrgs) {
      const user = users.find(u => u.user_id === userOrg.user_id);
      if (user && user.role && user.role.toLowerCase() !== userOrg.role.toLowerCase()) {
        mismatches.push({
          user,
          userOrg,
          correctRole: user.role,
          wrongRole: userOrg.role
        });
      }
    }
    
    console.log(`🔍 Found ${mismatches.length} role mismatches`);
    
    if (mismatches.length === 0) {
      console.log('✨ All roles are already correct!');
      return;
    }
    
    console.log('\\n📝 Role mismatches found:');
    mismatches.forEach((mismatch, index) => {
      console.log(`   ${index + 1}. ${mismatch.user.name} (${mismatch.user.email})`);
      console.log(`      - Current role in user_organizations: ${mismatch.wrongRole}`);
      console.log(`      - Correct role from users table: ${mismatch.correctRole}`);
    });
    
    console.log('\\n🔧 Fixing roles...');
    
    for (const mismatch of mismatches) {
      try {
        console.log(`   Updating ${mismatch.user.name} role to ${mismatch.correctRole}...`);
        
        const { error: updateError } = await supabase
          .from('user_organizations')
          .update({ role: mismatch.correctRole })
          .eq('user_id', mismatch.user.user_id)
          .eq('organization_id', mismatch.userOrg.organization_id);
        
        if (updateError) {
          console.error(`   ❌ Failed to update ${mismatch.user.name}:`, updateError.message);
        } else {
          console.log(`   ✅ Successfully updated ${mismatch.user.name}`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating ${mismatch.user.name}:`, error.message);
      }
    }
    
    console.log('\\n✨ Role fix completed!');
    
  } catch (error) {
    console.error('❌ Error during role fix:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix if called directly
if (require.main === module) {
  fixUserOrganizationRoles();
}

module.exports = { fixUserOrganizationRoles };