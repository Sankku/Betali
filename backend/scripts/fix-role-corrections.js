const { DatabaseConfig } = require('../config/database');

/**
 * Script to fix role assignments - user wants their account to be admin
 * and Valeria Bettoni to be employee/manager instead of super_admin
 */
async function fixRoleCorrections() {
  console.log('🔧 Correcting role assignments...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Define the corrections needed
    const roleCorrections = [
      {
        user_id: '4ef37216-5711-403a-96e9-5a2fdd286d85', // betali.business@gmail.com 
        email: 'betali.business@gmail.com',
        name: 'betali.business',
        currentUsersTableRole: 'member',
        newUsersTableRole: 'admin', // Make this user an admin
        currentOrgRole: 'employee', 
        newOrgRole: 'super_admin' // This will map to super_admin in user_organizations
      },
      {
        user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259', // gaselave@hotmail.com
        email: 'gaselave@hotmail.com', 
        name: 'Valeria Bettoni',
        currentUsersTableRole: 'manager',
        newUsersTableRole: 'employee', // Make Valeria a regular employee
        currentOrgRole: 'super_admin',
        newOrgRole: 'employee' // Regular employee access
      }
    ];
    
    console.log('\\n📋 Role corrections to apply:');
    roleCorrections.forEach((correction, index) => {
      console.log(`\\n${index + 1}. ${correction.name} (${correction.email})`);
      console.log(`   Users table: "${correction.currentUsersTableRole}" → "${correction.newUsersTableRole}"`);
      console.log(`   Org table: "${correction.currentOrgRole}" → "${correction.newOrgRole}"`);
    });
    
    console.log('\\n🔧 Applying corrections...');
    
    for (const correction of roleCorrections) {
      console.log(`\\n👤 Updating ${correction.name}...`);
      
      try {
        // Update users table
        console.log(`   Updating users table role: ${correction.currentUsersTableRole} → ${correction.newUsersTableRole}`);
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ role: correction.newUsersTableRole })
          .eq('user_id', correction.user_id);
          
        if (userUpdateError) {
          console.error(`   ❌ Failed to update users table:`, userUpdateError.message);
          continue;
        } else {
          console.log(`   ✅ Users table updated`);
        }
        
        // Update user_organizations table for all their organizations
        console.log(`   Updating organization roles: ${correction.currentOrgRole} → ${correction.newOrgRole}`);
        const { error: orgUpdateError } = await supabase
          .from('user_organizations')
          .update({ role: correction.newOrgRole })
          .eq('user_id', correction.user_id);
          
        if (orgUpdateError) {
          console.error(`   ❌ Failed to update user_organizations table:`, orgUpdateError.message);
        } else {
          console.log(`   ✅ Organization roles updated`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error updating ${correction.name}:`, error.message);
      }
    }
    
    console.log('\\n✨ Role corrections completed!');
    console.log('\\n📊 Summary:');
    console.log('   • betali.business: Now admin with super_admin organization access');
    console.log('   • Valeria Bettoni: Now employee with employee organization access');
    console.log('\\n💡 The UI will now show:');
    console.log('   • betali.business as "Administrator" ');
    console.log('   • Valeria Bettoni as "Employee"');
    
  } catch (error) {
    console.error('❌ Error during role corrections:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the corrections if called directly
if (require.main === module) {
  fixRoleCorrections();
}

module.exports = { fixRoleCorrections };