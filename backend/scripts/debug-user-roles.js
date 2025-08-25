const { DatabaseConfig } = require('../config/database');

/**
 * Script to debug user roles and organization relationships
 */
async function debugUserRoles() {
  console.log('🔍 Debugging user roles and organization relationships...');
  
  try {
    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Get users with their roles
    console.log('\n📋 Users in users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, email, name, role, organization_id')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      - Role in users table: ${user.role || 'NULL'}`);
      console.log(`      - Organization ID: ${user.organization_id || 'NULL'}`);
      console.log('');
    });
    
    // Get user-organization relationships
    console.log('\n📋 User-organization relationships:');
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, role, permissions, organization:organizations(name)')
      .order('user_id');
    
    if (userOrgsError) {
      console.error('❌ Error fetching user-organizations:', userOrgsError);
      return;
    }
    
    // Group by user
    const userOrgMap = {};
    userOrgs.forEach(rel => {
      if (!userOrgMap[rel.user_id]) {
        userOrgMap[rel.user_id] = [];
      }
      userOrgMap[rel.user_id].push(rel);
    });
    
    users.forEach(user => {
      const rels = userOrgMap[user.user_id] || [];
      console.log(`   ${user.name} (${user.email}):`);
      if (rels.length === 0) {
        console.log('      ❌ No organization relationships found');
      } else {
        rels.forEach(rel => {
          console.log(`      - ${rel.organization?.name || rel.organization_id}: role = ${rel.role || 'NULL'}`);
        });
      }
      console.log('');
    });
    
    // Find specific user (Valeria Bettoni)
    const valeria = users.find(u => u.email === 'gaselave@hotmail.com');
    if (valeria) {
      console.log('\n🔍 Detailed info for Valeria Bettoni:');
      console.log(`   User ID: ${valeria.user_id}`);
      console.log(`   Email: ${valeria.email}`);
      console.log(`   Role in users table: ${valeria.role}`);
      console.log(`   Organization ID in users table: ${valeria.organization_id}`);
      
      const valeriaRels = userOrgMap[valeria.user_id] || [];
      console.log(`   Organization relationships (${valeriaRels.length}):`);
      valeriaRels.forEach(rel => {
        console.log(`     - Org: ${rel.organization_id}`);
        console.log(`     - Role: ${rel.role}`);
        console.log(`     - Permissions: ${rel.permissions || 'NULL'}`);
        console.log(`     - Org Name: ${rel.organization?.name || 'Unknown'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the debug if called directly
if (require.main === module) {
  debugUserRoles();
}

module.exports = { debugUserRoles };