const { DatabaseConfig } = require('../config/database');

/**
 * Script to add audit columns to users table
 * Adds: updated_by, deactivated_by, deactivated_at
 */

async function addAuditColumns() {
  const dbConfig = new DatabaseConfig();
  const client = dbConfig.getClient();

  console.log('🔄 Starting audit columns migration...');

  try {
    // Check current schema
    console.log('📋 Checking current users table schema...');
    const { data: columns, error: schemaError } = await client
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('❌ Error checking schema:', schemaError);
      return;
    }

    console.log('📊 Current columns:', columns.map(c => c.column_name).join(', '));

    // Check which columns are missing
    const existingColumns = columns.map(c => c.column_name);
    const columnsToAdd = [];

    if (!existingColumns.includes('updated_by')) {
      columnsToAdd.push('updated_by');
    }
    if (!existingColumns.includes('deactivated_by')) {
      columnsToAdd.push('deactivated_by');
    }
    if (!existingColumns.includes('deactivated_at')) {
      columnsToAdd.push('deactivated_at');
    }

    if (columnsToAdd.length === 0) {
      console.log('✅ All audit columns already exist!');
      return;
    }

    console.log(`🔧 Need to add columns: ${columnsToAdd.join(', ')}`);

    // Create SQL for missing columns
    const sqlStatements = [];
    
    if (columnsToAdd.includes('updated_by')) {
      sqlStatements.push('ALTER TABLE users ADD COLUMN updated_by uuid REFERENCES users(user_id)');
    }
    
    if (columnsToAdd.includes('deactivated_by')) {
      sqlStatements.push('ALTER TABLE users ADD COLUMN deactivated_by uuid REFERENCES users(user_id)');
    }
    
    if (columnsToAdd.includes('deactivated_at')) {
      sqlStatements.push('ALTER TABLE users ADD COLUMN deactivated_at timestamp with time zone');
    }

    console.log('📝 SQL statements to execute:');
    sqlStatements.forEach(sql => console.log(`  ${sql}`));

    // Execute the SQL statements
    for (const sql of sqlStatements) {
      console.log(`🔄 Executing: ${sql}`);
      
      const { error } = await client.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`❌ Error executing SQL: ${sql}`);
        console.error('Error details:', error);
        
        // Try alternative approach using Supabase edge function or direct SQL
        console.log('🔄 Trying alternative approach...');
        console.log('ℹ️  Please execute this SQL manually in your Supabase dashboard:');
        console.log(`   ${sql};`);
      } else {
        console.log(`✅ Successfully executed: ${sql}`);
      }
    }

    // Verify the changes
    console.log('🔍 Verifying changes...');
    const { data: newColumns, error: verifyError } = await client
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
    } else {
      console.log('📊 Updated columns:', newColumns.map(c => c.column_name).join(', '));
      
      const hasAllColumns = ['updated_by', 'deactivated_by', 'deactivated_at']
        .every(col => newColumns.some(c => c.column_name === col));
      
      if (hasAllColumns) {
        console.log('✅ All audit columns successfully added!');
      } else {
        console.log('⚠️  Some columns may still be missing. Please check manually.');
      }
    }

    console.log('✨ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Self-executing function
if (require.main === module) {
  addAuditColumns()
    .then(() => {
      console.log('🏁 Script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addAuditColumns };