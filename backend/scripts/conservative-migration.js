const { DatabaseConfig } = require('../config/database');

/**
 * Conservative migration that works with existing schema
 * Maps existing roles to new semantic meaning without changing enum
 */
async function runConservativeMigration() {
  console.log('🚀 Starting Conservative SaaS Migration...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Step 1: Get current state
    console.log('📊 Step 1: Analyzing current data...');
    
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*');
    
    if (orgError) throw new Error(`Organizations fetch failed: ${orgError.message}`);
    
    const { data: userOrgs, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('*');
    
    if (userOrgError) throw new Error(`User organizations fetch failed: ${userOrgError.message}`);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) throw new Error(`Users fetch failed: ${usersError.message}`);
    
    console.log(`   📈 Found: ${users.length} users, ${organizations.length} organizations, ${userOrgs.length} relationships`);
    
    // Step 2: Implement organization ownership logic
    console.log('\n🔧 Step 2: Setting up organization ownership...');
    
    // For now, we'll use a semantic mapping approach
    // The first user in each organization becomes the "owner" (but we keep the role as super_admin)
    const organizationOwnership = new Map();
    
    organizations.forEach(org => {
      const orgUsers = userOrgs.filter(uo => uo.organization_id === org.organization_id);
      if (orgUsers.length > 0) {
        // Sort by joined_at to get the first user
        orgUsers.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
        const owner = orgUsers[0];
        organizationOwnership.set(org.organization_id, {
          userId: owner.user_id,
          isOwner: true,
          currentRole: owner.role
        });
        
        console.log(`   👑 Organization "${org.name}": Owner is user ${owner.user_id}`);
      }
    });
    
    // Step 3: Create a mapping table in memory (later we'll add it to DB)
    console.log('\n📋 Step 3: Creating role mapping...');
    
    const roleMapping = {
      // Current DB role → New semantic role
      'super_admin': {
        isOwner: (orgId, userId) => organizationOwnership.get(orgId)?.userId === userId,
        getSemanticRole: function(orgId, userId) {
          return this.isOwner(orgId, userId) ? 'owner' : 'admin';
        }
      }
    };
    
    console.log('   ✅ Role mapping created');
    
    // Step 4: Test the mapping
    console.log('\n🧪 Step 4: Testing role mapping...');
    
    userOrgs.forEach(userOrg => {
      const mapper = roleMapping[userOrg.role];
      if (mapper) {
        const semanticRole = mapper.getSemanticRole(userOrg.organization_id, userOrg.user_id);
        const user = users.find(u => u.user_id === userOrg.user_id);
        const org = organizations.find(o => o.organization_id === userOrg.organization_id);
        
        console.log(`   👤 ${user?.email} in "${org?.name}": ${userOrg.role} → ${semanticRole}`);
      }
    });
    
    // Step 5: Check if we can add owner_user_id field to organizations
    console.log('\n🏗️ Step 5: Attempting to add organization ownership field...');
    
    // Check if owner_user_id already exists
    const { data: orgSample } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    const hasOwnerField = orgSample?.[0]?.hasOwnProperty('owner_user_id');
    
    if (hasOwnerField) {
      console.log('   ✅ owner_user_id field already exists');
      
      // Update organizations with their owners
      for (const [orgId, ownership] of organizationOwnership) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ owner_user_id: ownership.userId })
          .eq('organization_id', orgId);
        
        if (updateError) {
          console.log(`   ⚠️  Could not set owner for org ${orgId}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Set owner for organization ${orgId}`);
        }
      }
    } else {
      console.log('   ⚠️  owner_user_id field needs to be added via SQL or Supabase dashboard');
    }
    
    // Step 6: Check business tables
    console.log('\n🏪 Step 6: Checking business tables for multi-tenancy...');
    
    const businessTables = ['products', 'warehouse', 'stock_movements', 'clients', 'orders'];
    const tableStatus = {};
    
    for (const table of businessTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          const hasOrgId = data?.[0]?.hasOwnProperty('organization_id');
          const recordCount = await getTableCount(supabase, table);
          
          tableStatus[table] = {
            hasOrgId,
            recordCount,
            status: hasOrgId ? 'READY' : 'NEEDS_MIGRATION'
          };
          
          console.log(`   📊 ${table}: ${hasOrgId ? '✅' : '❌'} organization_id, ${recordCount} records`);
        } else {
          tableStatus[table] = { status: 'ERROR', error: error.message };
          console.log(`   ❌ ${table}: ${error.message}`);
        }
      } catch (err) {
        tableStatus[table] = { status: 'EXCEPTION', error: err.message };
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
    // Step 7: Create application-level role mapping configuration
    console.log('\n⚙️  Step 7: Creating application configuration...');
    
    const appConfig = {
      roleMapping: {
        // Database role → Application permissions
        'super_admin': {
          organizationLevel: (orgId, userId) => {
            const ownership = organizationOwnership.get(orgId);
            return ownership?.userId === userId ? 'owner' : 'admin';
          },
          permissions: ['*'] // All permissions
        }
      },
      organizationOwnership: Object.fromEntries(organizationOwnership),
      migrationStatus: {
        roleSystemMigrated: true,
        organizationOwnershipSet: hasOwnerField,
        tablesNeedingMigration: Object.entries(tableStatus)
          .filter(([table, status]) => status.status === 'NEEDS_MIGRATION')
          .map(([table]) => table)
      }
    };
    
    // Save configuration to a file
    const fs = require('fs');
    const configPath = require('path').join(__dirname, '..', 'config', 'migration-status.json');
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    
    console.log(`   ✅ Configuration saved to: ${configPath}`);
    
    // Step 8: Summary
    console.log('\n📋 Migration Summary:');
    console.log('✅ Role mapping system implemented');
    console.log('✅ Organization ownership logic created');
    console.log(`${hasOwnerField ? '✅' : '⚠️ '} Organization ownership ${hasOwnerField ? 'set' : 'needs manual SQL'}`);
    console.log('✅ Application configuration created');
    
    const needsMigration = Object.values(tableStatus).filter(s => s.status === 'NEEDS_MIGRATION');
    if (needsMigration.length > 0) {
      console.log(`⚠️  ${needsMigration.length} tables need organization_id migration`);
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Update frontend to use role mapping system');
    console.log('2. Update backend services to use organization context');
    console.log('3. Add organization_id to remaining tables via SQL');
    console.log('4. Test multi-tenant functionality');
    
    console.log('\n📝 Application Usage:');
    console.log('- Import migration-status.json for role mapping');
    console.log('- Use roleMapping.super_admin.organizationLevel(orgId, userId) to get semantic role');
    console.log('- Treat first user in each org as the owner');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get count of records in a table
 */
async function getTableCount(supabase, tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    return error ? 0 : count;
  } catch (err) {
    return 0;
  }
}

// Run the migration
runConservativeMigration();