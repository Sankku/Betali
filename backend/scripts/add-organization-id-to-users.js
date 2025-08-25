const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function addOrganizationIdColumn() {
  try {
    console.log('🔧 Adding organization_id column to users table...');
    
    // Add organization_id column to users table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id);
      `
    });
    
    if (alterError) {
      console.error('❌ Error adding organization_id column:', alterError);
      return;
    }
    
    console.log('✅ Successfully added organization_id column to users table');
    
    // Verify the column was added
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('organization_id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Verification failed:', testError.message);
    } else {
      console.log('✅ Column verification successful');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Alternative method using direct SQL if rpc doesn't work
async function addOrganizationIdColumnDirect() {
  try {
    console.log('🔧 Adding organization_id column to users table (direct SQL)...');
    
    // Since we can't execute DDL directly through Supabase client, 
    // we need to do this through the Supabase dashboard or psql
    console.log(`
    ⚠️  MANUAL MIGRATION REQUIRED:
    
    Please run the following SQL in your Supabase SQL Editor:
    
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id);
    
    -- Optional: Add index for performance
    CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
    
    -- Optional: Add constraint to ensure non-super admin users have organization_id
    ALTER TABLE users 
    ADD CONSTRAINT check_organization_required 
    CHECK (
      (role = 'super_admin' AND organization_id IS NULL) OR 
      (role != 'super_admin' AND organization_id IS NOT NULL) OR
      role IS NULL
    );
    `);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Try the rpc method first, fallback to manual instructions
addOrganizationIdColumn().catch(() => {
  console.log('RPC method failed, showing manual migration instructions...');
  addOrganizationIdColumnDirect();
});