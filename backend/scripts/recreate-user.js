#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function recreateUser() {
  const userId = '4ef37216-5711-403a-96e9-5a2fdd286d85';
  const email = 'betali.business@gmail.com';
  
  console.log('🔧 Recreating user in public.users table...');
  console.log('User ID:', userId);
  console.log('Email:', email);
  
  try {
    // Create the user record in public.users with proper permissions
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        email: email,
        first_name: 'Betali',
        last_name: 'User',
        role: 'ADMIN', // Give admin role for full access
        is_active: true,
        permissions: ['*'], // Full permissions
        organization_id: null,
        settings: {},
        preferences: {}
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error creating user:', error.message);
      return;
    }
    
    console.log('✅ User created successfully in public.users:');
    console.log('User data:', data);
    
    // Verify the user was created
    console.log('\n🔍 Verifying user creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (verifyError) {
      console.log('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ User verification successful:');
      console.log('Verified data:', verifyData);
    }
    
  } catch (error) {
    console.error('❌ Error during user recreation:', error);
  }
}

recreateUser().then(() => process.exit(0));