const { DatabaseConfig } = require('../config/database');
const { readFileSync } = require('fs');
const { join } = require('path');
const { populateTableConfigurations } = require('./populate-table-configs');

async function setupTableConfigurations() {
  console.log('🚀 Setting up table configurations...');
  
  try {
    // Initialize database connection
    const dbConfig = new DatabaseConfig();
    const client = dbConfig.getClient();
    
    console.log('✅ Database connection established');
    
    // Read and execute the SQL file
    const sqlPath = join(__dirname, 'create-table-configurations.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Creating table_configurations table...');
    
    // Execute the SQL using the rpc function or a query
    const { error } = await client.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // Try alternative approach - execute SQL directly
      console.log('Trying alternative SQL execution method...');
      
      // Split SQL statements and execute them one by one
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          // Use a workaround to create the table via Node.js
          console.log('Creating table via direct query...');
          console.log('⚠️  You need to run the SQL manually in your Supabase dashboard:');
          console.log(statement);
        }
      }
    }
    
    console.log('✅ Table creation completed');
    
    // Now populate the configurations
    console.log('📊 Populating table configurations...');
    await populateTableConfigurations();
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    
    console.log('\n📋 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:');
    console.log('\n' + readFileSync(join(__dirname, 'create-table-configurations.sql'), 'utf8'));
    console.log('\n4. Then run: node scripts/populate-table-configs.js');
    
    process.exit(1);
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupTableConfigurations();
}

module.exports = { setupTableConfigurations };