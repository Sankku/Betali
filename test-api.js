require('dotenv').config({ path: './frontend/.env.development' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testEmail = `test${Date.now()}@example.com`;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
  });
  
  if (signUpError) {
    console.error("Signup error:", signUpError.message);
    return;
  }
  
  const token = signUpData.session.access_token;
  
  try {
    const res = await axios.get('http://localhost:3000/api/organizations/my', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Orgs for brand new user:", res.data);
  } catch (e) {
    console.error("API error:", e.response?.data || e.message);
  }
}
run();
