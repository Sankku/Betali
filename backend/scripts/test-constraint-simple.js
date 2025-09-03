#!/usr/bin/env node

/**
 * Simple test to check if the signup constraint is blocking user creation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testConstraint() {
  try {
    console.log('🧪 Testing signup constraint...');
    console.log('===============================');
    
    const testUser = {
      user_id: '00000000-0000-0000-0000-000000000001',
      email: 'constraint-test@betali.com',
      name: 'Constraint Test User',
      password_hash: 'dummy_hash_for_testing', // Required field
      organization_id: null, // This is what should be allowed during signup
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to create user with NULL organization_id...');
    
    // First, clean up any existing test user
    await supabase
      .from('users')
      .delete()
      .eq('user_id', testUser.user_id);
    
    // Now try to insert
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (error) {
      console.log('❌ USER CREATION FAILED');
      console.log('Error Code:', error.code);
      console.log('Error Message:', error.message);
      console.log('');
      
      if (error.message.includes('check_organization')) {
        console.log('🚨 CONSTRAINT ISSUE CONFIRMED');
        console.log('The signup constraint is blocking user creation.');
        console.log('');
        console.log('SOLUTION: Run the constraint fix script:');
        console.log('1. Execute: scripts/fix-signup-constraint-final.sql');
        console.log('2. Or temporarily disable the constraint');
        return 'BLOCKED';
      } else {
        console.log('⚠️  Different error occurred:', error.code);
        return 'OTHER_ERROR';
      }
    }
    
    console.log('✅ USER CREATION SUCCESSFUL');
    console.log('Created user:', data[0]);
    console.log('');
    console.log('🎉 The constraint is working correctly!');
    console.log('Users can be created with NULL organization_id during signup.');
    
    // Clean up
    await supabase
      .from('users')
      .delete()
      .eq('user_id', testUser.user_id);
    
    console.log('🧹 Test user cleaned up');
    return 'WORKING';
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return 'FAILED';
  }
}

async function main() {
  console.log('🔍 BETALI SIGNUP CONSTRAINT TEST');
  console.log('================================');
  console.log('');
  
  const result = await testConstraint();
  
  console.log('');
  console.log('📋 TEST RESULT:', result);
  console.log('');
  
  switch (result) {
    case 'BLOCKED':
      console.log('🚨 ACTION REQUIRED: Fix the database constraint');
      console.log('');
      console.log('The constraint is preventing user signup. Run:');
      console.log('node scripts/apply-constraint-fix.js');
      process.exit(1);
      
    case 'WORKING':
      console.log('✅ CONSTRAINT IS FIXED');
      console.log('');
      console.log('The database constraint allows signup. Next steps:');
      console.log('1. Test the signup endpoint');
      console.log('2. Complete frontend integration');
      break;
      
    case 'OTHER_ERROR':
      console.log('⚠️  UNKNOWN ERROR');
      console.log('Manual investigation required.');
      process.exit(1);
      
    case 'FAILED':
      console.log('💥 TEST FAILED');
      console.log('Check your database connection and environment variables.');
      process.exit(1);
  }
}

main();