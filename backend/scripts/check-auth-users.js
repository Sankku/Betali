#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkAuthUsers() {
  console.log('Checking public.users table...');
  
  try {
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*');
    
    if (publicError) {
      console.log('Public users error:', publicError.message);
    } else {
      console.log('Public users found:', publicUsers?.length || 0);
      if (publicUsers && publicUsers.length > 0) {
        console.log('Public users:', publicUsers);
      }
    }
  } catch (err) {
    console.log('Public users table error:', err.message);
  }

  // Check auth.users (this might not work with service key)
  console.log('\nTrying to check auth.users...');
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('Auth users error:', authError.message);
    } else {
      console.log('Auth users found:', authUsers?.users?.length || 0);
      if (authUsers?.users && authUsers.users.length > 0) {
        console.log('Auth users sample:', authUsers.users.slice(0, 3).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        })));
      }
    }
  } catch (err) {
    console.log('Auth users check error:', err.message);
  }
}

checkAuthUsers().then(() => process.exit(0));