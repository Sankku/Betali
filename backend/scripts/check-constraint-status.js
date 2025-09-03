#!/usr/bin/env node

/**
 * Check the current status of the organization constraint
 * This will help us understand if we need to apply the constraint fix
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkConstraintStatus() {
  try {
    console.log('🔍 Checking current constraint status...');
    console.log('=====================================');
    
    // Check what constraints exist on users table using raw SQL
    const { data: constraints, error } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          conname,
          contype,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND conname ILIKE '%organization%'
        ORDER BY conname
      `
    });
    
    if (error) {
      throw error;
    }
    
    console.log('Current organization-related constraints:');
    console.log('----------------------------------------');
    
    if (constraints.length === 0) {
      console.log('❌ No organization constraints found!');
      console.log('This might be the issue - users table has no organization constraint.');
      return 'no_constraints';
    }
    
    constraints.forEach((constraint, index) => {
      console.log(`${index + 1}. Name: ${constraint.conname}`);
      console.log(`   Type: ${constraint.contype}`);
      console.log(`   Definition: ${constraint.definition}`);
      console.log('');
    });
    
    // Check if the problematic constraint exists
    const problematicConstraint = constraints.find(c => 
      c.conname === 'check_organization_required'
    );
    
    if (problematicConstraint) {
      console.log('⚠️  FOUND PROBLEMATIC CONSTRAINT: check_organization_required');
      console.log('This constraint is likely blocking user creation during signup.');
      console.log('');
      console.log('Definition:', problematicConstraint.definition);
      console.log('');
      console.log('🔧 SOLUTION: Run the constraint fix script');
      return 'needs_fix';
    }
    
    // Check if our flexible constraint exists
    const flexibleConstraint = constraints.find(c => 
      c.conname === 'check_organization_signup_flexible' || 
      c.conname === 'check_organization_flexible'
    );
    
    if (flexibleConstraint) {
      console.log('✅ FLEXIBLE CONSTRAINT FOUND');
      console.log('The signup-friendly constraint is already in place.');
      console.log('');
      console.log('Definition:', flexibleConstraint.definition);
      return 'fixed';
    }
    
    console.log('❓ UNKNOWN STATE');
    console.log('Constraints exist but not the expected ones.');
    return 'unknown';
    
  } catch (error) {
    console.error('❌ Failed to check constraint status:', error.message);
    throw error;
  }
}

async function testUserCreation() {
  try {
    console.log('🧪 Testing user creation capability...');
    console.log('=====================================');
    
    const testUser = {
      user_id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      name: 'Test User',
      organization_id: null, // This should be allowed with the fix
      is_active: true
    };
    
    console.log('Attempting to insert test user with NULL organization_id...');
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (error) {
      if (error.message.includes('check_organization')) {
        console.log('❌ CONSTRAINT VIOLATION CONFIRMED');
        console.log('User creation failed due to organization constraint.');
        console.log('Error:', error.message);
        console.log('');
        console.log('🔧 SOLUTION: Apply the constraint fix immediately!');
        return 'blocked';
      } else if (error.code === '23505') {
        console.log('ℹ️  User already exists (duplicate key)');
        console.log('This is expected - the constraint is not the issue.');
        
        // Clean up the test
        await supabase
          .from('users')
          .delete()
          .eq('user_id', testUser.user_id);
          
        return 'working';
      } else {
        throw error;
      }
    }
    
    console.log('✅ USER CREATION SUCCESSFUL');
    console.log('Test user was created with NULL organization_id.');
    console.log('The signup constraint is working correctly.');
    
    // Clean up the test user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', testUser.user_id);
      
    if (deleteError) {
      console.log('⚠️  Warning: Could not clean up test user:', deleteError.message);
    } else {
      console.log('🧹 Test user cleaned up successfully');
    }
    
    return 'working';
    
  } catch (error) {
    console.error('❌ Failed to test user creation:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 BETALI SIGNUP CONSTRAINT DIAGNOSTIC');
    console.log('======================================');
    console.log('');
    
    const constraintStatus = await checkConstraintStatus();
    console.log('');
    
    const userCreationStatus = await testUserCreation();
    console.log('');
    
    console.log('📋 DIAGNOSTIC SUMMARY');
    console.log('====================');
    console.log('Constraint Status:', constraintStatus);
    console.log('User Creation:', userCreationStatus);
    console.log('');
    
    if (constraintStatus === 'needs_fix' || userCreationStatus === 'blocked') {
      console.log('🚨 ACTION REQUIRED: CONSTRAINT FIX NEEDED');
      console.log('');
      console.log('Run this command to fix the constraint:');
      console.log('psql $DATABASE_URL < scripts/fix-signup-constraint-final.sql');
      console.log('');
      console.log('Or execute the SQL manually through your database admin.');
      process.exit(1);
    } else if (constraintStatus === 'fixed' && userCreationStatus === 'working') {
      console.log('🎉 ALL GOOD: SIGNUP SHOULD WORK');
      console.log('');
      console.log('The database constraint has been fixed.');
      console.log('Users can now be created during the signup process.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test the signup endpoint');
      console.log('2. Implement frontend integration');
      console.log('3. Add onboarding experience');
    } else {
      console.log('⚠️  MIXED RESULTS - MANUAL INVESTIGATION NEEDED');
      console.log('');
      console.log('The diagnostic shows mixed results.');
      console.log('Manual investigation may be required.');
    }
    
  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message);
    process.exit(1);
  }
}

main();