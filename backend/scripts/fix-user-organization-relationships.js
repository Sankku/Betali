const { DatabaseConfig } = require('../config/database');

/**
 * Script to fix missing user-organization relationships
 * Finds users who have organization_id but no relationship in user_organizations table
 */
async function fixUserOrganizationRelationships() {
  console.log('🔗 Starting fix for missing user-organization relationships...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Get all users who have organization_id but no relationship in user_organizations
    console.log('📋 Finding users with missing organization relationships...');
    
    const { data: usersWithOrgId, error: userError } = await supabase
      .from('users')
      .select('user_id, email, name, organization_id')
      .not('organization_id', 'is', null);
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    console.log(`📊 Found ${usersWithOrgId.length} users with organization_id`);
    
    // Get existing user-organization relationships
    const { data: existingRelations, error: relationError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id');
    
    if (relationError) {
      console.error('❌ Error fetching user-organization relationships:', relationError);
      return;
    }
    
    console.log(`📊 Found ${existingRelations.length} existing relationships`);
    
    // Find users missing relationships
    const existingUserIds = new Set(existingRelations.map(rel => rel.user_id));
    const usersMissingRelations = usersWithOrgId.filter(user => !existingUserIds.has(user.user_id));
    
    console.log(`🔍 Found ${usersMissingRelations.length} users missing organization relationships`);
    
    if (usersMissingRelations.length === 0) {
      console.log('✨ All users already have proper organization relationships!');
      return;
    }
    
    console.log('\\n📝 Users missing relationships:');
    usersMissingRelations.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) → Org: ${user.organization_id}`);
    });
    
    console.log('\\n🔧 Creating missing relationships...');
    
    for (const user of usersMissingRelations) {
      try {
        console.log(`   Creating relationship for ${user.name}...`);
        
        const { error: insertError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user.user_id,
            organization_id: user.organization_id
          });
        
        if (insertError) {
          console.error(`   ❌ Failed to create relationship for ${user.name}:`, insertError.message);
        } else {
          console.log(`   ✅ Successfully created relationship for ${user.name}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating relationship for ${user.name}:`, error.message);
      }
    }
    
    console.log('\\n✨ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix if called directly
if (require.main === module) {
  fixUserOrganizationRelationships();
}

module.exports = { fixUserOrganizationRelationships };