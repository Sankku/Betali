/**
 * Script to set a password for an existing Supabase Auth user (e.g. OAuth-only accounts).
 * Usage: node scripts/set-user-password.js <user_id> <new_password>
 * Example: node scripts/set-user-password.js 457a9a92-857a-487e-8b81-30df2ec6577c MiPassword123!
 */

const { DatabaseConfig } = require('../config/database');

async function setUserPassword(userId, newPassword) {
  if (!userId || !newPassword) {
    console.error('Usage: node scripts/set-user-password.js <user_id> <new_password>');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  const dbConfig = new DatabaseConfig();
  const supabase = dbConfig.getClient();

  console.log(`🔄 Setting password for user: ${userId}`);

  // Verify the user exists first
  const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
  if (getUserError || !existingUser?.user) {
    console.error(`❌ User not found: ${getUserError?.message || 'unknown error'}`);
    process.exit(1);
  }

  console.log(`✅ User found: ${existingUser.user.email}`);
  console.log(`   Provider: ${existingUser.user.app_metadata?.provider || 'unknown'}`);

  // Set the password via Admin API
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    console.error(`❌ Failed to set password: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ Password set successfully for ${data.user.email}`);
  console.log(`   They can now log in with email + password.`);
}

const [,, userId, newPassword] = process.argv;
setUserPassword(userId, newPassword);
