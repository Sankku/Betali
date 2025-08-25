const { DatabaseConfig } = require('../config/database');

/**
 * Check if organization_id column exists in users table
 */

async function checkOrganizationColumn() {
  const dbConfig = new DatabaseConfig();
  const client = dbConfig.getClient();

  console.log('🔍 Checking if organization_id column exists in users table...');

  try {
    // Try to select organization_id from users table
    const { data, error } = await client
      .from('users')
      .select('user_id, email, organization_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column "organization_id" does not exist')) {
        console.log('❌ organization_id column does NOT exist in users table');
        console.log('📝 You need to add this column. Run the following SQL:');
        console.log('   ALTER TABLE users ADD COLUMN organization_id uuid REFERENCES organizations(organization_id);');
        return false;
      } else {
        console.error('❌ Error checking organization_id column:', error.message);
        return false;
      }
    }

    console.log('✅ organization_id column EXISTS in users table');
    console.log('📊 Sample data:', data[0] || 'No users found');
    return true;

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    return false;
  }
}

// Self-executing function
if (require.main === module) {
  checkOrganizationColumn()
    .then(exists => {
      if (exists) {
        console.log('\n🎉 organization_id column is ready!');
        process.exit(0);
      } else {
        console.log('\n💡 Please add the organization_id column to users table first');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkOrganizationColumn };