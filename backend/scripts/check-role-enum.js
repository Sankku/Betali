const { DatabaseConfig } = require('../config/database');

/**
 * Script to check what role enum values are defined in the database
 */
async function checkRoleEnum() {
  console.log('🔍 Checking role enum values in database...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Query to get enum values
    console.log('📋 Querying role enum values...');
    
    // Check what roles actually exist in the user_organizations table
    const { data: existingRoles, error } = await supabase
      .from('user_organizations')
      .select('role')
      .not('role', 'is', null);
    
    if (error) {
      console.error('❌ Error fetching existing roles:', error);
      return;
    }
    
    const uniqueRoles = [...new Set(existingRoles.map(r => r.role))];
    console.log('📊 Roles currently used in user_organizations table:');
    uniqueRoles.forEach((role, index) => {
      console.log(`   ${index + 1}. "${role}"`);
    });
    
    // Also check what roles exist in users table
    const { data: userRoles, error: userRolesError } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);
      
    if (!userRolesError) {
      const uniqueUserRoles = [...new Set(userRoles.map(r => r.role))];
      console.log('\\n📊 Roles currently used in users table:');
      uniqueUserRoles.forEach((role, index) => {
        console.log(`   ${index + 1}. "${role}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during enum check:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the check if called directly
if (require.main === module) {
  checkRoleEnum();
}

module.exports = { checkRoleEnum };