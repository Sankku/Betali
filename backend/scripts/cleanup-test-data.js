#!/usr/bin/env node

/**
 * Clean up test data script
 * Removes test organizations and users to allow fresh testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clean up test organizations (those with test-related names)
    const testPatterns = [
      'test%',
      'Test%',
      'JonaTest%',
      'Mi Empresa Test%',
      'Mi Restaurante Test%',
      'Endpoints Test%',
      'La Cocina Real%',
      'SuperMercado Beta%',
      'Test Coupon Organization%'
    ];

    for (const pattern of testPatterns) {
      console.log(`🔍 Cleaning organizations matching pattern: ${pattern}`);
      
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('organization_id, name')
        .ilike('name', pattern);

      if (orgError) {
        console.error('Error fetching organizations:', orgError);
        continue;
      }

      if (orgs && orgs.length > 0) {
        console.log(`📋 Found ${orgs.length} organizations to cleanup:`, orgs.map(o => o.name));
        
        // Delete organizations (CASCADE should handle related data)
        for (const org of orgs) {
          console.log(`🗑️  Deleting organization: ${org.name}`);
          
          const { error: deleteError } = await supabase
            .from('organizations')
            .delete()
            .eq('organization_id', org.organization_id);
            
          if (deleteError) {
            console.error(`❌ Error deleting org ${org.name}:`, deleteError);
          } else {
            console.log(`✅ Deleted organization: ${org.name}`);
          }
        }
      } else {
        console.log(`✅ No organizations found matching pattern: ${pattern}`);
      }
    }

    // Clean up test users
    const userTestPatterns = [
      'test%',
      'owner+%',
      'manager+%',
      'test-coupon%'
    ];

    for (const pattern of userTestPatterns) {
      console.log(`🔍 Cleaning users matching pattern: ${pattern}`);
      
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('user_id, email')
        .ilike('email', pattern);

      if (userError) {
        console.error('Error fetching users:', userError);
        continue;
      }

      if (users && users.length > 0) {
        console.log(`📋 Found ${users.length} users to cleanup:`, users.map(u => u.email));
        
        for (const user of users) {
          console.log(`🗑️  Deleting user: ${user.email}`);
          
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('user_id', user.user_id);
            
          if (deleteError) {
            console.error(`❌ Error deleting user ${user.email}:`, deleteError);
          } else {
            console.log(`✅ Deleted user: ${user.email}`);
          }
        }
      } else {
        console.log(`✅ No users found matching pattern: ${pattern}`);
      }
    }

    console.log('🎉 Cleanup completed successfully!');
    console.log('');
    console.log('You can now test with fresh data:');
    console.log('1. Go to http://localhost:3002');
    console.log('2. Register a new organization');
    console.log('3. Test the full flow');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTestData().catch(console.error);