#!/usr/bin/env node

/**
 * Check database constraint status for signup issue
 * This uses the DatabaseConfig from the app
 */

const { DatabaseConfig } = require('../config/database');

async function checkConstraints() {
  try {
    console.log('🔍 CHECKING DATABASE CONSTRAINT STATUS');
    console.log('======================================\n');

    const dbConfig = new DatabaseConfig();
    const supabase = dbConfig.getClient();

    // Check constraints on users table
    const { data: constraints, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            conname,
            contype,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = 'users'::regclass
          AND conname LIKE '%organization%'
          ORDER BY conname
        `
      });

    if (error) {
      console.log('⚠️  Could not query constraints directly, trying alternative method...\n');

      // Try to test user creation instead
      const testUserId = '00000000-0000-0000-0000-999999999999';

      console.log('🧪 Testing: Can we create a user with NULL organization_id?');

      const { data: testUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          user_id: testUserId,
          email: 'constraint-test@test.com',
          name: 'Constraint Test',
          organization_id: null,
          is_active: true
        }])
        .select();

      if (insertError) {
        if (insertError.message.includes('check_organization')) {
          console.log('❌ CONSTRAINT BLOCKING SIGNUP DETECTED!\n');
          console.log('Error:', insertError.message);
          console.log('\n🔧 SOLUTION NEEDED: Apply constraint fix');
          console.log('Run: bun run scripts/apply-constraint-fix.js\n');
          return 'blocked';
        } else if (insertError.code === '23505') {
          console.log('ℹ️  Test user already exists (expected)\n');
          // Clean up
          await supabase.from('users').delete().eq('user_id', testUserId);
          console.log('✅ CONSTRAINT IS OK: Signup should work\n');
          return 'ok';
        } else {
          console.log('❌ Unexpected error:', insertError.message);
          return 'error';
        }
      }

      console.log('✅ TEST USER CREATED: Constraint allows NULL organization_id\n');
      console.log('Cleaning up test user...');
      await supabase.from('users').delete().eq('user_id', testUserId);
      console.log('✅ CONSTRAINT IS OK: Signup should work\n');
      return 'ok';
    }

    // If we got constraints data, display it
    console.log('📋 Current organization-related constraints:\n');

    if (!constraints || constraints.length === 0) {
      console.log('ℹ️  No organization constraints found');
      console.log('This might mean the constraint was already removed.\n');
      return 'no_constraints';
    }

    constraints.forEach((c, i) => {
      console.log(`${i + 1}. ${c.conname}`);
      console.log(`   Type: ${c.contype}`);
      console.log(`   Definition: ${c.definition}\n`);
    });

    // Check for problematic constraint
    const hasProblematicConstraint = constraints.some(c =>
      c.conname === 'check_organization_required'
    );

    if (hasProblematicConstraint) {
      console.log('⚠️  FOUND: check_organization_required constraint');
      console.log('This constraint likely blocks signup!\n');
      return 'needs_fix';
    }

    const hasFlexibleConstraint = constraints.some(c =>
      c.conname === 'check_organization_signup_flexible' ||
      c.conname === 'check_organization_flexible'
    );

    if (hasFlexibleConstraint) {
      console.log('✅ GOOD: Flexible constraint is in place');
      console.log('Signup should work correctly\n');
      return 'ok';
    }

    return 'unknown';

  } catch (error) {
    console.error('❌ Error:', error.message);
    return 'error';
  }
}

async function main() {
  const status = await checkConstraints();

  console.log('📊 RESULT:', status);
  console.log('=================\n');

  if (status === 'blocked' || status === 'needs_fix') {
    console.log('🚨 ACTION REQUIRED:');
    console.log('1. Review: backend/scripts/fix-signup-constraint-final.sql');
    console.log('2. Apply the fix to your database');
    console.log('3. Re-run this script to verify\n');
    process.exit(1);
  } else if (status === 'ok' || status === 'no_constraints') {
    console.log('✅ DATABASE READY FOR SIGNUP');
    console.log('Next steps:');
    console.log('1. Test the signup endpoint');
    console.log('2. Update frontend integration');
    console.log('3. Add comprehensive tests\n');
    process.exit(0);
  } else {
    console.log('⚠️  MANUAL INVESTIGATION NEEDED\n');
    process.exit(2);
  }
}

main();
