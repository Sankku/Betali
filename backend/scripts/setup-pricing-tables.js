const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Logger } = require('../utils/Logger');

/**
 * Setup pricing tables in Supabase
 * Creates all necessary tables for the tax management system
 */
async function setupPricingTables() {
  const logger = new Logger('PricingTablesSetup');
  
  try {
    logger.info('Starting pricing tables setup...');

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase client initialized');

    // Read the SQL schema file
    const sqlFilePath = path.join(__dirname, 'create-pricing-schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    logger.info('SQL schema file loaded');

    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));

    logger.info(`Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      try {
        logger.info(`Executing statement ${i + 1}/${statements.length}`, { 
          statementPreview: statement.substring(0, 100) + '...' 
        });
        
        // Execute SQL statement directly
        const { error } = await supabase.rpc('exec_sql', statement);

        if (error) {
          // Check if it's a "already exists" error which we can ignore
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key value')) {
            logger.warn(`Statement ${i + 1} - Table/constraint already exists, skipping`, { 
              error: error.message 
            });
            successCount++;
          } else {
            logger.error(`Statement ${i + 1} failed`, { error: error.message });
            errorCount++;
          }
        } else {
          successCount++;
          logger.info(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        logger.error(`Statement ${i + 1} threw exception`, { error: err.message });
        errorCount++;
      }
    }

    logger.info('Pricing tables setup completed', { 
      successCount, 
      errorCount, 
      totalStatements: statements.length 
    });

    if (errorCount === 0) {
      logger.info('✅ All pricing tables created successfully!');
    } else {
      logger.warn(`⚠️ Setup completed with ${errorCount} errors. Check logs above.`);
    }

    // Test that tables were created by querying tax_rates
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('count', { count: 'exact' })
        .limit(0);

      if (error) {
        logger.error('Failed to verify tax_rates table creation', { error: error.message });
      } else {
        logger.info('✅ Tax rates table verified successfully');
      }
    } catch (testError) {
      logger.error('Failed to test tax_rates table', { error: testError.message });
    }

  } catch (error) {
    logger.error('Fatal error during pricing tables setup', { error: error.message });
    throw error;
  }
}

// Execute setup if run directly
if (require.main === module) {
  setupPricingTables()
    .then(() => {
      console.log('\n🎉 Pricing tables setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Pricing tables setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupPricingTables };