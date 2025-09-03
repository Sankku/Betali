const { createClient } = require('@supabase/supabase-js');
const { Logger } = require('../utils/Logger');

/**
 * Simple script to create just the tax_rates table
 */
async function createTaxRatesTable() {
  const logger = new Logger('CreateTaxRatesTable');
  
  try {
    logger.info('Creating tax_rates table...');

    // Use the same client configuration as the rest of the app
    const supabase = require('../lib/supabaseClient');
    
    logger.info('Supabase client initialized');

    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1);

    if (testError) {
      logger.error('Failed to connect to Supabase', { error: testError.message });
      throw new Error('Database connection failed');
    }

    logger.info('Database connection verified');

    // Check if tax_rates table already exists
    try {
      const { data: existingData, error: existingError } = await supabase
        .from('tax_rates')
        .select('tax_rate_id')
        .limit(1);

      if (!existingError) {
        logger.info('✅ Tax rates table already exists and is accessible!');
        return { success: true, message: 'Table already exists' };
      }
    } catch (e) {
      logger.info('Tax rates table does not exist, will create it');
    }

    // Since we can't create tables directly with the client in Supabase,
    // we'll need to inform the user to create it via the Supabase dashboard
    logger.error('❌ Cannot create table programmatically with current Supabase setup');
    logger.info('📋 Please create the tax_rates table manually in Supabase dashboard with this schema:');
    
    console.log(`
    CREATE TABLE tax_rates (
      tax_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      rate DECIMAL(8,6) NOT NULL,
      is_inclusive BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    CREATE INDEX idx_tax_rates_org ON tax_rates(organization_id);
    CREATE INDEX idx_tax_rates_active ON tax_rates(organization_id, is_active);

    ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY tax_rates_org_policy ON tax_rates
      FOR ALL USING (
        organization_id IN (
          SELECT uo.organization_id 
          FROM user_organizations uo 
          WHERE uo.user_id = auth.uid() AND uo.is_active = true
        )
      );
    `);

    return { success: false, message: 'Manual table creation required' };

  } catch (error) {
    logger.error('Error creating tax rates table', { error: error.message });
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  createTaxRatesTable()
    .then((result) => {
      if (result.success) {
        console.log('✅ Tax rates table is ready!');
        process.exit(0);
      } else {
        console.log('⚠️ Manual setup required - see instructions above');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTaxRatesTable };