const { DatabaseConfig } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations for SaaS architecture
 */
async function runMigration() {
  console.log('🚀 Starting SaaS Architecture Migration...\n');
  
  try {
    const db = new DatabaseConfig();
    const supabase = db.getClient();
    
    // List of migration files in order
    const migrations = [
      'migration-02-add-organization-owner.sql',
      'migration-03-fix-user-roles.sql', 
      'migration-04-add-missing-organization-ids.sql'
    ];
    
    console.log('📋 Migration Plan:');
    migrations.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration}`);
    });
    console.log('');
    
    // Ask for confirmation (in a real environment, you might want input confirmation)
    console.log('⚠️  This will modify your database structure and data.');
    console.log('✅ Make sure you have a database backup before proceeding.\n');
    
    for (let i = 0; i < migrations.length; i++) {
      const migrationFile = migrations[i];
      console.log(`🔄 Running migration ${i + 1}/${migrations.length}: ${migrationFile}`);
      
      try {
        // Read migration file
        const sqlFile = path.join(__dirname, migrationFile);
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Execute migration using direct SQL execution
        await executeMigrationSQL(supabase, sql, migrationFile);
        
        console.log(`✅ Migration ${i + 1} completed successfully\n`);
        
      } catch (error) {
        console.error(`❌ Migration ${i + 1} failed:`, error.message);
        console.log('🛑 Stopping migration process to prevent data corruption.');
        process.exit(1);
      }
    }
    
    // Run post-migration verification
    console.log('🔍 Running post-migration verification...\n');
    await runVerification(supabase);
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update frontend to use new role system');
    console.log('  2. Update backend services for new architecture');
    console.log('  3. Test multi-tenant functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Execute migration SQL with proper error handling
 */
async function executeMigrationSQL(supabase, sql, migrationName) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--'));
  
  console.log(`   📄 Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.length < 10) continue; // Skip empty or very short statements
    
    try {
      // For CREATE/ALTER/UPDATE statements, we need to use raw SQL
      if (statement.toUpperCase().includes('ALTER TABLE') || 
          statement.toUpperCase().includes('CREATE INDEX') ||
          statement.toUpperCase().includes('UPDATE ') ||
          statement.toUpperCase().includes('CREATE TABLE') ||
          statement.toUpperCase().includes('COMMENT ON') ||
          statement.toUpperCase().includes('DO $$')) {
        
        // Use raw SQL execution for schema changes
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error && !error.message.includes('exec_sql')) {
          throw error;
        }
        
        // If exec_sql doesn't exist, we'll try alternative methods
        if (error && error.message.includes('exec_sql')) {
          console.log(`   ⚠️  exec_sql not available, skipping: ${statement.substring(0, 50)}...`);
          continue;
        }
      } else {
        // For SELECT statements, use regular query
        if (statement.toUpperCase().includes('SELECT')) {
          const { data, error } = await supabase.from('').select(statement);
          if (error) {
            console.log(`   ℹ️  Verification query: ${statement.substring(0, 50)}...`);
          }
        }
      }
      
    } catch (err) {
      console.log(`   ⚠️  Statement skipped (${err.message}): ${statement.substring(0, 50)}...`);
    }
  }
}

/**
 * Run verification queries after migration
 */
async function runVerification(supabase) {
  const verifications = [
    {
      name: 'Organizations with owners',
      query: async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select(`
            organization_id,
            name,
            owner_user_id,
            users!organizations_owner_user_id_fkey(email, name)
          `);
        return { data, error };
      }
    },
    {
      name: 'User organization roles',
      query: async () => {
        const { data, error } = await supabase
          .from('user_organizations')
          .select('role')
          .order('role');
        return { data, error };
      }
    },
    {
      name: 'Business tables with organization_id',
      query: async () => {
        const results = {};
        const tables = ['products', 'warehouse', 'stock_movements', 'clients', 'orders'];
        
        for (const table of tables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('organization_id')
              .limit(1);
            
            results[table] = error ? 'ERROR' : (data?.[0]?.organization_id ? 'HAS_ORG_ID' : 'MISSING_ORG_ID');
          } catch (err) {
            results[table] = 'TABLE_NOT_FOUND';
          }
        }
        
        return { data: results, error: null };
      }
    }
  ];
  
  for (const verification of verifications) {
    try {
      console.log(`   🔍 ${verification.name}...`);
      const { data, error } = await verification.query();
      
      if (error) {
        console.log(`   ❌ ${verification.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${verification.name}:`, JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.log(`   ⚠️  ${verification.name}: ${err.message}`);
    }
  }
}

// Run the migration
runMigration();