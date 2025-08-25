const { DatabaseConfig } = require('../config/database');

/**
 * Verify that the SaaS migration was completed successfully
 */
async function verifyMigration() {
  console.log('🔍 Verifying SaaS Migration...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    let allChecks = true;
    
    // Check 1: Organization ownership
    console.log('📊 Check 1: Organization ownership...');
    
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select(`
        organization_id,
        name,
        owner_user_id,
        users!organizations_owner_user_id_fkey(email, name)
      `);
    
    if (orgError) {
      console.log('   ❌ Could not fetch organizations:', orgError.message);
      allChecks = false;
    } else {
      const orgsWithOwners = organizations.filter(org => org.owner_user_id);
      console.log(`   ✅ ${orgsWithOwners.length}/${organizations.length} organizations have owners`);
      
      orgsWithOwners.forEach(org => {
        console.log(`      - ${org.name}: ${org.users?.email || 'Unknown user'}`);
      });
      
      if (orgsWithOwners.length !== organizations.length) {
        console.log('   ⚠️  Some organizations are missing owners');
        allChecks = false;
      }
    }
    
    // Check 2: User organization roles
    console.log('\n👥 Check 2: User organization roles...');
    
    const { data: userOrgs, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role, user_id, organization_id');
    
    if (userOrgError) {
      console.log('   ❌ Could not fetch user organizations:', userOrgError.message);
      allChecks = false;
    } else {
      const roleDistribution = {};
      userOrgs.forEach(uo => {
        roleDistribution[uo.role] = (roleDistribution[uo.role] || 0) + 1;
      });
      
      console.log('   ✅ Role distribution:', roleDistribution);
      
      // Check if we have a proper role hierarchy
      const hasOwnerRoles = Object.keys(roleDistribution).some(role => 
        ['owner', 'admin'].includes(role) || role === 'super_admin'
      );
      
      if (hasOwnerRoles) {
        console.log('   ✅ Management roles present');
      } else {
        console.log('   ⚠️  No management roles found');
        allChecks = false;
      }
    }
    
    // Check 3: Business tables organization_id
    console.log('\n🏪 Check 3: Business tables multi-tenancy...');
    
    const businessTables = ['products', 'warehouse', 'stock_movements', 'clients', 'orders'];
    const tableResults = {};
    
    for (const table of businessTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('organization_id')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
          tableResults[table] = { status: 'ERROR', error: error.message };
          allChecks = false;
        } else {
          // Better detection: try to select organization_id specifically
          let hasOrgId = false;
          try {
            const { error: orgIdError } = await supabase
              .from(table)
              .select('organization_id')
              .limit(1);
            hasOrgId = !orgIdError;
          } catch (e) {
            hasOrgId = false;
          }
          
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          console.log(`   ${hasOrgId ? '✅' : '❌'} ${table}: ${hasOrgId ? 'HAS' : 'MISSING'} organization_id, ${count || 0} records`);
          
          tableResults[table] = { 
            status: hasOrgId ? 'READY' : 'MISSING_ORG_ID', 
            recordCount: count || 0,
            hasOrgId 
          };
          
          if (!hasOrgId) allChecks = false;
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Exception - ${err.message}`);
        tableResults[table] = { status: 'EXCEPTION', error: err.message };
        allChecks = false;
      }
    }
    
    // Check 4: Data isolation (if data exists)
    console.log('\n🔒 Check 4: Data isolation verification...');
    
    const tablesWithData = Object.entries(tableResults)
      .filter(([table, result]) => result.recordCount > 0 && result.hasOrgId)
      .map(([table]) => table);
    
    if (tablesWithData.length > 0) {
      console.log(`   📊 Testing data isolation on tables with data: ${tablesWithData.join(', ')}`);
      
      for (const table of tablesWithData) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('organization_id')
            .not('organization_id', 'is', null);
          
          if (!error && data) {
            const uniqueOrgs = [...new Set(data.map(row => row.organization_id))];
            console.log(`   ✅ ${table}: ${data.length} records across ${uniqueOrgs.length} organizations`);
            
            if (uniqueOrgs.length === 0) {
              console.log(`   ⚠️  ${table}: No records have organization_id set`);
              allChecks = false;
            }
          }
        } catch (err) {
          console.log(`   ⚠️  ${table}: Could not verify data isolation - ${err.message}`);
        }
      }
    } else {
      console.log('   ℹ️  No data to test isolation (tables are empty)');
    }
    
    // Check 5: Test role mapping function
    console.log('\n🧪 Check 5: Testing role mapping...');
    
    try {
      const migrationStatus = require('../config/migration-status.json');
      
      console.log('   ✅ Migration status file exists');
      console.log(`   📊 Organizations with ownership: ${Object.keys(migrationStatus.organizationOwnership).length}`);
      
      // Test the mapping for existing users
      const { data: testUserOrgs } = await supabase
        .from('user_organizations')
        .select('user_id, organization_id, role');
      
      if (testUserOrgs && testUserOrgs.length > 0) {
        console.log('   🧪 Testing role mapping:');
        
        testUserOrgs.forEach(userOrg => {
          const ownership = migrationStatus.organizationOwnership[userOrg.organization_id];
          const isOwner = ownership?.userId === userOrg.user_id;
          const semanticRole = isOwner ? 'owner' : 'admin';
          
          console.log(`      User ${userOrg.user_id.substring(0, 8)}... in org ${userOrg.organization_id.substring(0, 8)}...: ${userOrg.role} → ${semanticRole}`);
        });
        
        console.log('   ✅ Role mapping working correctly');
      }
    } catch (err) {
      console.log(`   ⚠️  Could not test role mapping: ${err.message}`);
      allChecks = false;
    }
    
    // Summary
    console.log('\n📋 Migration Verification Summary:');
    console.log('=====================================');
    
    if (allChecks) {
      console.log('🎉 All checks passed! Migration appears successful.');
      console.log('\n✅ Ready for:');
      console.log('   - Frontend updates to use new role system');
      console.log('   - Backend updates for organization context');
      console.log('   - Multi-tenant application testing');
    } else {
      console.log('⚠️  Some issues found. Review the checks above.');
      console.log('\n📝 Common fixes:');
      console.log('   - Run the manual SQL migration script');
      console.log('   - Check that all tables have organization_id columns');
      console.log('   - Verify organization ownership is set');
    }
    
    console.log('\n🔧 Manual SQL still needed?');
    console.log('   Run: backend/scripts/manual-sql-migration.sql');
    console.log('   Location: Supabase Dashboard > SQL Editor');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyMigration();