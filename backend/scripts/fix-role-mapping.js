const { DatabaseConfig } = require('../config/database');

/**
 * Script to fix role mapping between users and user_organizations tables
 */
async function fixRoleMapping() {
  console.log('🔧 Fixing role mapping between tables...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Define role mapping from users table to user_organizations table
    // Note: Only 'super_admin' and 'employee' are valid in the enum
    const roleMapping = {
      'member': 'employee',
      'manager': 'super_admin',  // Map manager to super_admin (best available option)
      'admin': 'super_admin',
      'super_admin': 'super_admin', 
      'employee': 'employee',
      'viewer': 'employee'       // Map viewer to employee as fallback
    };
    
    console.log('📋 Role mapping defined:');
    Object.entries(roleMapping).forEach(([from, to]) => {
      console.log(`   "${from}" → "${to}"`);
    });
    
    // Get all user-organization relationships that need updating
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, role, users!inner(role)')
      .neq('users.role', null);
    
    if (userOrgsError) {
      console.error('❌ Error fetching user-organizations:', userOrgsError);
      return;
    }
    
    console.log(`\\n📊 Found ${userOrgs.length} user-organization relationships to check`);
    
    const updates = [];
    
    for (const userOrg of userOrgs) {
      const userRole = userOrg.users.role;
      const correctRole = roleMapping[userRole];
      
      if (correctRole && correctRole !== userOrg.role) {
        updates.push({
          user_id: userOrg.user_id,
          organization_id: userOrg.organization_id,
          currentRole: userOrg.role,
          correctRole: correctRole,
          userTableRole: userRole
        });
      }
    }
    
    console.log(`🔍 Found ${updates.length} roles that need updating`);
    
    if (updates.length === 0) {
      console.log('✨ All roles are already correct!');
      return;
    }
    
    console.log('\\n📝 Updates needed:');
    updates.forEach((update, index) => {
      console.log(`   ${index + 1}. User ${update.user_id.substring(0, 8)}...`);
      console.log(`      - User table role: "${update.userTableRole}"`);
      console.log(`      - Current org role: "${update.currentRole}"`); 
      console.log(`      - Correct org role: "${update.correctRole}"`);
      console.log('');
    });
    
    console.log('🔧 Applying updates...');
    
    for (const update of updates) {
      try {
        console.log(`   Updating user ${update.user_id.substring(0, 8)}... from "${update.currentRole}" to "${update.correctRole}"`);
        
        const { error: updateError } = await supabase
          .from('user_organizations')
          .update({ role: update.correctRole })
          .eq('user_id', update.user_id)
          .eq('organization_id', update.organization_id);
        
        if (updateError) {
          console.error(`   ❌ Failed: ${updateError.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\\n✨ Role mapping fix completed!');
    console.log('\\n🔍 Valeria Bettoni should now show as "admin" role (mapped from "manager")');
    
  } catch (error) {
    console.error('❌ Error during role mapping fix:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix if called directly
if (require.main === module) {
  fixRoleMapping();
}

module.exports = { fixRoleMapping };