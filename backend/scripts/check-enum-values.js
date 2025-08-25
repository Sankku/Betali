const { DatabaseConfig } = require('../config/database');

/**
 * Check enum values in the database to understand constraints
 */
async function checkEnumValues() {
  console.log('🔍 Checking database enum values...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Try to see current role values
    console.log('📊 Current role values in user_organizations:');
    
    const { data: userOrgs, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role');
    
    if (!userOrgError) {
      const uniqueRoles = [...new Set(userOrgs.map(uo => uo.role))];
      console.log('   Existing roles:', uniqueRoles);
    } else {
      console.log('   Error fetching roles:', userOrgError.message);
    }
    
    // Check users table roles too
    console.log('\n📊 Current role values in users:');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role');
    
    if (!usersError) {
      const uniqueUserRoles = [...new Set(users.map(u => u.role))];
      console.log('   Existing user roles:', uniqueUserRoles);
    } else {
      console.log('   Error fetching user roles:', usersError.message);
    }
    
    // Test if we can insert new roles
    console.log('\n🧪 Testing role insertions...');
    
    // Let's try to see what happens if we create a test user_organization with different roles
    const testRoles = ['owner', 'admin', 'manager', 'employee', 'viewer'];
    
    for (const role of testRoles) {
      console.log(`   Testing role: ${role}`);
      
      // We won't actually insert, just see what error we get
      try {
        const { error } = await supabase
          .from('user_organizations')
          .update({ role: role })
          .eq('user_organization_id', 'test-non-existent-id'); // This will fail but show us the enum error
        
        if (error) {
          if (error.message.includes('invalid input value for enum')) {
            console.log(`   ❌ ${role}: Not allowed by enum`);
          } else if (error.message.includes('No rows found')) {
            console.log(`   ✅ ${role}: Would be allowed (no enum error)`);
          } else {
            console.log(`   ⚠️  ${role}: Other error: ${error.message.substring(0, 50)}...`);
          }
        } else {
          console.log(`   ✅ ${role}: Would be allowed`);
        }
      } catch (err) {
        console.log(`   ❌ ${role}: Exception: ${err.message.substring(0, 50)}...`);
      }
    }
    
    console.log('\n📝 Analysis:');
    console.log('Based on the enum errors, we need to:');
    console.log('1. Either update the enum to include new role values');
    console.log('2. Or use existing role values that work with current schema');
    console.log('3. Current schema seems to only support: super_admin (and possibly others)');
    
    console.log('\n💡 Suggested approach:');
    console.log('- Keep using existing role values for now');
    console.log('- Map semantic meaning in application code');
    console.log('- Update database schema later via Supabase dashboard');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkEnumValues();