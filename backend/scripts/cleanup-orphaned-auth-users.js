const { DatabaseConfig } = require('../config/database');

/**
 * Script to clean up orphaned users in Supabase Auth
 * (users that exist in Auth but not in our database)
 */
async function cleanupOrphanedAuthUsers() {
  console.log('🧹 Starting cleanup of orphaned Supabase Auth users...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Get all users from Supabase Auth
    console.log('📋 Fetching all users from Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching Auth users:', authError);
      return;
    }
    
    console.log(`📊 Found ${authUsers.users.length} users in Supabase Auth`);
    
    // Get all users from our database
    console.log('📋 Fetching all users from database...');
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('user_id, email');
    
    if (dbError) {
      console.error('❌ Error fetching DB users:', dbError);
      return;
    }
    
    console.log(`📊 Found ${dbUsers.length} users in database`);
    
    // Find orphaned users (in Auth but not in DB)
    const dbUserIds = new Set(dbUsers.map(user => user.user_id));
    const orphanedUsers = authUsers.users.filter(authUser => !dbUserIds.has(authUser.id));
    
    console.log(`🔍 Found ${orphanedUsers.length} orphaned users in Supabase Auth`);
    
    if (orphanedUsers.length === 0) {
      console.log('✨ No orphaned users found. All clean!');
      return;
    }
    
    console.log('\n📝 Orphaned users to clean up:');
    orphanedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });
    
    console.log('\n🗑️  Cleaning up orphaned users...');
    
    for (const user of orphanedUsers) {
      try {
        console.log(`   Deleting ${user.email}...`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`   ❌ Failed to delete ${user.email}:`, deleteError.message);
        } else {
          console.log(`   ✅ Successfully deleted ${user.email}`);
        }
      } catch (error) {
        console.error(`   ❌ Error deleting ${user.email}:`, error.message);
      }
    }
    
    console.log('\n✨ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup if called directly
if (require.main === module) {
  cleanupOrphanedAuthUsers();
}

module.exports = { cleanupOrphanedAuthUsers };