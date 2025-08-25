const { DatabaseConfig } = require('../config/database');

/**
 * Detailed check to see exactly what happened with the migration
 */
async function detailedCheck() {
  console.log('🔍 Detailed Migration Check...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Check 1: Verify organization ownership worked
    console.log('📊 1. Organization Ownership:');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*');
    
    if (!orgError) {
      orgs.forEach(org => {
        console.log(`   ✅ ${org.name}: owner_user_id = ${org.owner_user_id ? '✓' : '✗'}`);
      });
    }
    
    // Check 2: Detailed table structure check
    console.log('\n🏗️ 2. Table Structure Analysis:');
    
    const tablesToCheck = ['clients', 'orders', 'products', 'warehouse'];
    
    for (const table of tablesToCheck) {
      console.log(`\n   📋 ${table}:`);
      
      try {
        // Get a sample record to see the structure
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`      ❌ Error: ${error.message}`);
        } else {
          const hasOrgId = data?.[0]?.hasOwnProperty('organization_id');
          console.log(`      organization_id: ${hasOrgId ? '✅ Present' : '❌ Missing'}`);
          
          if (data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`      Columns (${columns.length}): ${columns.slice(0, 6).join(', ')}${columns.length > 6 ? '...' : ''}`);
          } else {
            console.log(`      No data to check columns`);
          }
          
          // Check total count
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          console.log(`      Records: ${count || 0}`);
        }
      } catch (err) {
        console.log(`      ❌ Exception: ${err.message}`);
      }
    }
    
    // Check 3: Test inserting data with organization_id
    console.log('\n🧪 3. Testing Organization Context:');
    
    const testOrgId = orgs?.[0]?.organization_id;
    if (testOrgId) {
      console.log(`   Using test org: ${testOrgId}`);
      
      // Test if we can filter by organization_id (even if no data)
      const testTables = ['products', 'warehouse', 'stock_movements'];
      
      for (const table of testTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('organization_id', testOrgId);
          
          if (!error) {
            console.log(`   ✅ ${table}: Can filter by organization_id (${data.length} records)`);
          } else {
            console.log(`   ❌ ${table}: Cannot filter - ${error.message}`);
          }
        } catch (err) {
          console.log(`   ❌ ${table}: Exception - ${err.message}`);
        }
      }
    }
    
    // Check 4: Check if the SQL actually ran
    console.log('\n🔍 4. SQL Execution Check:');
    
    // Try to see if we can detect any evidence of the SQL running
    try {
      // Check if there are any comments on columns (our SQL adds comments)
      console.log('   Checking for column comments (evidence of SQL execution)...');
      
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);
      
      if (orgData?.[0]?.owner_user_id !== null && orgData?.[0]?.owner_user_id !== undefined) {
        console.log('   ✅ organizations.owner_user_id exists and has data');
      } else {
        console.log('   ⚠️  organizations.owner_user_id missing or null');
      }
    } catch (err) {
      console.log(`   ❌ Could not check SQL execution: ${err.message}`);
    }
    
    // Check 5: Simple table existence check
    console.log('\n📊 5. Simple Table Existence:');
    
    const allTables = ['users', 'organizations', 'user_organizations', 'products', 'warehouse', 'stock_movements', 'clients', 'orders'];
    
    for (const table of allTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        console.log(`   ${error ? '❌' : '✅'} ${table}: ${error ? error.message : 'Accessible'}`);
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('If clients and orders show "Missing organization_id" but are accessible,');
    console.log('it likely means the ALTER TABLE commands for those tables didn\'t execute.');
    console.log('You may need to run those specific SQL commands manually.');
    
  } catch (error) {
    console.error('❌ Detailed check failed:', error.message);
  }
}

// Run detailed check
detailedCheck();