#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function simpleUserInsert() {
  const userId = '4ef37216-5711-403a-96e9-5a2fdd286d85';
  const email = 'betali.business@gmail.com';
  
  console.log('🔧 Trying simple user insert...');
  
  try {
    // Try with minimal required fields only
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        name: 'Betali User',
        email: email,
        password_hash: 'managed_by_supabase_auth', // Placeholder since managed by Supabase Auth
        is_active: true,
        role: 'ADMIN'
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('Error details:', error);
      return;
    }
    
    console.log('✅ User created successfully:');
    console.log('User data:', data);
    
  } catch (error) {
    console.error('❌ Catch error:', error);
  }
}

simpleUserInsert().then(() => process.exit(0));