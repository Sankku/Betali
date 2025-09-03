const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Need to define SUPABASE_URL & SUPABASE_SERVICE_KEY this variables are required.');
}

/**
 * Shared Supabase client instance
 * This singleton ensures only one client is created and reused across the application
 */
const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabaseClient;