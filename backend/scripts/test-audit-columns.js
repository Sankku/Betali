const { DatabaseConfig } = require('../config/database');

/**
 * Test script to verify audit columns exist and work
 */

async function testAuditColumns() {
  const dbConfig = new DatabaseConfig();
  const client = dbConfig.getClient();

  console.log('🧪 Testing audit columns in users table...');

  try {
    // Test if we can select the new columns
    console.log('📋 Testing SELECT with audit columns...');
    
    const { data, error } = await client
      .from('users')
      .select('user_id, email, updated_by, deactivated_by, deactivated_at')
      .limit(1);

    if (error) {
      console.error('❌ Error selecting audit columns:', error.message);
      console.log('\n📝 SQL script to execute in Supabase dashboard:');
      console.log('   File: backend/scripts/add-audit-columns.sql');
      return false;
    }

    console.log('✅ Successfully selected audit columns!');
    console.log('📊 Sample data:', data[0] || 'No users found');

    // Test if we can update with audit columns
    console.log('\n🔄 Testing UPDATE with audit columns...');
    
    if (data && data.length > 0) {
      const testUserId = data[0].user_id;
      
      const { error: updateError } = await client
        .from('users')
        .update({
          updated_at: new Date().toISOString(),
          updated_by: testUserId // Self-reference for testing
        })
        .eq('user_id', testUserId);

      if (updateError) {
        console.error('❌ Error updating with audit columns:', updateError.message);
        return false;
      }

      console.log('✅ Successfully updated with audit columns!');
    }

    console.log('\n🎉 All audit columns are working correctly!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Self-executing function
if (require.main === module) {
  testAuditColumns()
    .then(success => {
      if (success) {
        console.log('\n🏁 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Tests failed - please run the SQL migration first');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuditColumns };