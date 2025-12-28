const { DatabaseConfig } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runAlertsFix() {
  console.log('🚀 Fixing Inventory Alerts Logic...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // Read the migration file
    const sqlFile = path.join(__dirname, '../migrations/fix_inventory_alerts_logic.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // We can't split by semicolon arbitrarily because of the function body.
    // We will try to execute the whole thing, or split by explicit 'COMMIT;' if needed.
    // But since exec_sql usually takes a single query, and CREATE FUNCTION is one statement, we can try to send it block by block.
    // However, the file has BEGIN; ... COMMIT; transaction structure.
    
    // Simplest strategy: Remove BEGIN/COMMIT and run the Main Block via exec_sql.
    // Or just try running the whole thing if exec_sql supports transactions (it should).
    
    console.log('📄 Executing SQL...');
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });

    if (error) {
      console.error('❌ SQL Execution failed:', error.message);
      if (error.message.includes('exec_sql')) {
          console.error('⚠️ exec_sql function not found in database. Cannot auto-migrate.');
      }
    } else {
      console.log('✅ SQL Executed successfully.');
      
      // Now run the cleanup explicitly to be sure
      console.log('🧹 Running cleanup: resolve_stale_alerts...');
      
      // We need to get all organization IDs to clean up for each
      const { data: orgs } = await supabase.from('organizations').select('organization_id');
      
      if (orgs && orgs.length > 0) {
        let totalResolved = 0;
        for (const org of orgs) {
           // Call the newly created function
           // We can use rpc if we exposed it, or select from it.
           // The function is: resolve_stale_alerts(p_organization_id uuid) RETURNS integer
           
           const { data: count, error: cleanupError } = await supabase.rpc('resolve_stale_alerts', {
             p_organization_id: org.organization_id
           });
           
           if (!cleanupError) {
             totalResolved += (count || 0);
           } else {
             console.error(`Error cleaning org ${org.organization_id}: ${cleanupError.message}`);
           }
        }
        console.log(`✅ Cleanup complete. Resolved ${totalResolved} stale alerts.`);
      }
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

runAlertsFix();
