const { DatabaseConfig } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run database analysis script to understand current state
 */
async function runAnalysis() {
  console.log('🔍 Starting database analysis...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Read the analysis SQL file
    const sqlFile = path.join(__dirname, 'migration-01-analyze-current-state.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by comments and execute each query separately
    const queries = sql.split('--').filter(q => q.trim() && !q.trim().startsWith('Migration'));
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (!query || query.startsWith('This script') || query.startsWith('Run this')) continue;
      
      console.log(`📊 Executing query ${i + 1}...`);
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
        
        if (error) {
          console.error(`❌ Error in query ${i + 1}:`, error.message);
          continue;
        }
        
        console.log('✅ Results:', data);
        console.log('---\n');
        
      } catch (err) {
        console.log(`⚠️ Query ${i + 1} failed, trying direct approach...`);
        
        // Try direct table queries for common cases
        if (query.includes('FROM users')) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .limit(1);
          
          if (!userError && userData) {
            console.log('✅ Users table exists, sample role:', userData[0]?.role || 'No role found');
          }
        }
        
        if (query.includes('FROM organizations')) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .limit(1);
          
          if (!orgError && orgData) {
            console.log('✅ Organizations table exists, sample data:', orgData[0] || 'No data');
          }
        }
        
        if (query.includes('FROM user_organizations')) {
          const { data: userOrgData, error: userOrgError } = await supabase
            .from('user_organizations')
            .select('role')
            .limit(1);
          
          if (!userOrgError && userOrgData) {
            console.log('✅ User_organizations table exists, sample role:', userOrgData[0]?.role || 'No role found');
          }
        }
      }
    }
    
    // Additional manual checks
    console.log('\n🔍 Additional manual checks...\n');
    
    // Check users count and roles
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, email, role, is_active');
      
      if (!usersError) {
        console.log(`📊 Users table: ${users.length} users found`);
        const roleDistribution = {};
        users.forEach(user => {
          roleDistribution[user.role || 'null'] = (roleDistribution[user.role || 'null'] || 0) + 1;
        });
        console.log('👥 Role distribution:', roleDistribution);
      }
    } catch (err) {
      console.log('⚠️ Could not analyze users table:', err.message);
    }
    
    // Check organizations count
    try {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('organization_id, name, slug');
      
      if (!orgsError) {
        console.log(`🏢 Organizations table: ${orgs.length} organizations found`);
        orgs.forEach(org => console.log(`  - ${org.name} (${org.slug})`));
      }
    } catch (err) {
      console.log('⚠️ Could not analyze organizations table:', err.message);
    }
    
    // Check user-organization relationships
    try {
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('user_id, organization_id, role, is_active');
      
      if (!userOrgsError) {
        console.log(`🔗 User-organization relationships: ${userOrgs.length} relationships found`);
        const orgRoleDistribution = {};
        userOrgs.forEach(rel => {
          orgRoleDistribution[rel.role || 'null'] = (orgRoleDistribution[rel.role || 'null'] || 0) + 1;
        });
        console.log('🎭 Organization role distribution:', orgRoleDistribution);
      }
    } catch (err) {
      console.log('⚠️ Could not analyze user_organizations table:', err.message);
    }
    
    // Check business tables for organization_id
    console.log('\n🏭 Checking business tables for organization_id...\n');
    
    const businessTables = ['products', 'warehouse', 'stock_movements', 'clients', 'orders'];
    
    for (const table of businessTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error && data) {
          const hasOrgId = data.length > 0 && data[0].hasOwnProperty('organization_id');
          console.log(`📋 ${table}: ${hasOrgId ? '✅ HAS' : '❌ MISSING'} organization_id`);
          if (data.length > 0) {
            console.log(`   Sample columns:`, Object.keys(data[0]).slice(0, 5).join(', '));
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: Table not accessible or doesn't exist`);
      }
    }
    
    console.log('\n✅ Database analysis complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run the analysis
runAnalysis();