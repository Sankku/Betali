const { DatabaseConfig } = require('../config/database');

/**
 * Check what columns actually exist in each table
 */
async function checkActualColumns() {
  console.log('🔍 Checking actual table columns...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Method: Try to insert empty data and see what required columns show up
    const tablesToCheck = ['clients', 'orders'];
    
    for (const table of tablesToCheck) {
      console.log(`📊 ${table} table analysis:`);
      
      try {
        // Try an empty insert to see what fields are required/available
        const { data, error } = await supabase
          .from(table)
          .insert({})
          .select();
        
        if (error) {
          console.log(`   Error message: ${error.message}`);
          
          // Parse the error to understand the table structure
          if (error.message.includes('null value in column')) {
            const match = error.message.match(/null value in column "([^"]+)"/);
            if (match) {
              console.log(`   🔸 Required column found: ${match[1]}`);
            }
          }
          
          if (error.message.includes('violates not-null constraint')) {
            const match = error.message.match(/violates not-null constraint "([^"]+)"/);
            if (match) {
              console.log(`   🔸 Required constraint: ${match[1]}`);
            }
          }
        } else {
          console.log(`   ✅ Empty insert succeeded (no required columns)`);
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`);
      }
      
      // Try a more targeted approach - test if organization_id column exists
      try {
        const { data, error } = await supabase
          .from(table)
          .select('organization_id')
          .limit(1);
        
        if (error) {
          if (error.message.includes('column "organization_id" does not exist')) {
            console.log(`   ❌ organization_id: Column does NOT exist`);
          } else {
            console.log(`   ⚠️  organization_id: Other error - ${error.message}`);
          }
        } else {
          console.log(`   ✅ organization_id: Column EXISTS`);
        }
      } catch (err) {
        console.log(`   ❌ organization_id check failed: ${err.message}`);
      }
      
      // Check what columns we CAN select (by trying to select everything)
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error && data) {
          if (data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`   📋 Available columns (${columns.length}): ${columns.join(', ')}`);
          } else {
            console.log(`   📋 Table exists but is empty - cannot determine columns from data`);
            
            // Try to get column info another way
            console.log(`   🔍 Attempting to determine structure...`);
            
            // Common columns to test
            const testColumns = ['id', 'name', 'email', 'created_at', 'updated_at', 'organization_id', 'user_id'];
            const existingColumns = [];
            
            for (const col of testColumns) {
              try {
                const { error: colError } = await supabase
                  .from(table)
                  .select(col)
                  .limit(0);
                
                if (!colError) {
                  existingColumns.push(col);
                }
              } catch (e) {
                // Column doesn't exist
              }
            }
            
            if (existingColumns.length > 0) {
              console.log(`   📋 Detected columns: ${existingColumns.join(', ')}`);
            }
          }
        } else if (error) {
          console.log(`   ❌ Cannot select from table: ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ Select failed: ${err.message}`);
      }
      
      console.log(''); // Empty line between tables
    }
    
    // Final test: try to use organization_id in a WHERE clause
    console.log('🧪 Final Test: Using organization_id in WHERE clauses');
    
    const testOrgId = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4';
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('organization_id', testOrgId);
        
        if (error) {
          console.log(`   ❌ ${table}: Cannot filter by organization_id - ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: Can filter by organization_id (${data.length} records)`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Exception filtering - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Column check failed:', error.message);
  }
}

// Run the check
checkActualColumns();