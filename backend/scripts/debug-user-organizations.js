const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');

async function debugUserOrganizations() {
  const logger = new Logger('DebugUserOrganizations');
  
  try {
    logger.info('🔍 Debugging user organization data...');
    
    // From the logs, the user ID is: 4ef37216-5711-403a-96e9-5a2fdd286d85
    const userId = '4ef37216-5711-403a-96e9-5a2fdd286d85';
    logger.info('Checking user ID', { userId });
    
    // Check if user exists
    logger.info('1. Checking if user exists...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (userError) {
      logger.error('❌ User not found', { error: userError.message });
    } else {
      logger.info('✅ User found', { 
        user_id: user.user_id, 
        email: user.email,
        is_active: user.is_active 
      });
    }
    
    // Check user_organizations table
    logger.info('2. Checking user_organizations...');
    const { data: userOrgs, error: orgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId);
    
    if (orgError) {
      logger.error('❌ Error fetching user organizations', { error: orgError.message });
    } else {
      logger.info('✅ User organizations found', { count: userOrgs?.length || 0 });
      if (userOrgs && userOrgs.length > 0) {
        userOrgs.forEach((org, i) => {
          logger.info(`User organization ${i+1}`, {
            organization_id: org.organization_id,
            role: org.role,
            is_active: org.is_active
          });
        });
      }
    }
    
    // Check user_organizations with is_active filter (what the auth middleware uses)
    logger.info('3. Checking active user_organizations (auth middleware query)...');
    const { data: activeUserOrgs, error: activeOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role, permissions, organization:organizations(*)')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (activeOrgError) {
      logger.error('❌ Error fetching active user organizations', { error: activeOrgError.message });
    } else {
      logger.info('✅ Active user organizations found', { count: activeUserOrgs?.length || 0 });
      if (activeUserOrgs && activeUserOrgs.length > 0) {
        activeUserOrgs.forEach((org, i) => {
          logger.info(`Active organization ${i+1}`, {
            organization_id: org.organization_id,
            role: org.role,
            organizationName: org.organization?.name
          });
        });
      }
    }
    
    // Check organizations table directly
    logger.info('4. Checking available organizations...');
    const { data: allOrgs, error: allOrgsError } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(5);
    
    if (allOrgsError) {
      logger.error('❌ Error fetching organizations', { error: allOrgsError.message });
    } else {
      logger.info('✅ Available organizations', { count: allOrgs?.length || 0 });
      allOrgs?.forEach((org, i) => {
        logger.info(`Organization ${i+1}`, { 
          id: org.organization_id, 
          name: org.name 
        });
      });
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('- Check if user exists in users table');
    console.log('- Check if user has records in user_organizations table');
    console.log('- Check if user_organizations records are is_active=true');
    console.log('- Verify organization join works properly');
    
  } catch (error) {
    logger.error('💥 Debug failed', { error: error.message });
  }
}

// Execute debug if run directly
if (require.main === module) {
  debugUserOrganizations()
    .then(() => {
      console.log('\n✨ User organization debug completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 User organization debug failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugUserOrganizations };