const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');

const logger = new Logger('AuthMiddleware');

/**
 * Authentication middleware
 * Provides error handling and logging
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without proper authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized. Bearer token required.',
        code: 'MISSING_TOKEN'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    let user = null;
    let error = null;
    
    // First try Supabase auth
    try {
      const { data: supabaseData, error: supabaseError } = await supabase.auth.getUser(token);
      
      if (!supabaseError && supabaseData?.user) {
        user = supabaseData.user;
        error = null;
      } else {
        // Supabase failed, try our temporary token format
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf8');
          const tokenPayload = JSON.parse(decoded);
          
          // Verify token hasn't expired
          if (tokenPayload.exp && tokenPayload.exp > Math.floor(Date.now() / 1000)) {
            // Create user object compatible with Supabase format
            user = {
              id: tokenPayload.sub,
              email: tokenPayload.email,
              user_metadata: tokenPayload.user_metadata || {},
              created_at: new Date(tokenPayload.iat * 1000).toISOString()
            };
            error = null;
            
            logger.info('Using temporary token for authentication', {
              userId: user.id,
              email: user.email
            });
          } else {
            error = { message: 'Token has expired' };
          }
        } catch (tempTokenError) {
          error = supabaseError || { message: 'Invalid token format' };
          logger.warn('Both Supabase and temporary token validation failed', {
            supabaseError: supabaseError?.message,
            tempTokenError: tempTokenError.message
          });
        }
      }
    } catch (authError) {
      error = { message: 'Authentication service error' };
      logger.error('Authentication service error', { error: authError.message });
    }
    
    if (error || !user) {
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Invalid or expired token.';
      
      if (error && error.message?.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Token has expired.';
      }
      
      logger.warn('Authentication failed', {
        error: error?.message || 'User not found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        error: errorMessage,
        code: errorCode
      });
    }
    
    try {
      // Get user basic info (no role field since it's now per-organization)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, is_active')
        .eq('user_id', user.id)
        .single();
      
      if (!userError && userData) {
        user.profile = userData;
        user.isActive = userData.is_active !== false; // Default to active
        
        // Check if user is active
        if (!user.isActive) {
          logger.warn('Inactive user attempted to authentication', {
            userId: user.id,
            email: user.email
          });
          
          return res.status(403).json({
            error: 'Account is inactive',
            message: 'Your account has been deactivated. Please contact an administrator.',
            code: 'ACCOUNT_INACTIVE'
          });
        }

        // For multi-tenant: Get organization context and roles
        try {
          logger.info('Fetching user organizations', { userId: user.id });
          const { data: userOrgs, error: orgError } = await supabase
            .from('user_organizations')
            .select('organization_id, role, permissions, organization:organizations(*)')
            .eq('user_id', user.id)
            .eq('is_active', true);

          logger.info('User organizations query result', { 
            userId: user.id, 
            orgError: orgError?.message, 
            userOrgsCount: userOrgs?.length || 0,
            userOrgs: userOrgs?.map(org => ({ id: org.organization_id, role: org.role })) 
          });

          if (!orgError && userOrgs && userOrgs.length > 0) {
            // Assign highest role (for global permissions)
            const roleHierarchy = ['viewer', 'employee', 'manager', 'admin', 'super_admin', 'owner'];
            const highestRole = userOrgs.reduce((highest, org) => {
              const currentRoleIndex = roleHierarchy.indexOf(org.role.toLowerCase());
              const highestRoleIndex = roleHierarchy.indexOf(highest.toLowerCase());
              return currentRoleIndex > highestRoleIndex ? org.role : highest;
            }, 'viewer');
            
            user.role = highestRole.toUpperCase(); // Keep uppercase for backward compatibility
            user.organizationRoles = userOrgs; // Store all org roles for context switching
            
            // Set current organization context from request header or first organization
            const requestedOrgId = req.headers['x-organization-id'];
            let currentOrg = null;
            
            if (requestedOrgId) {
              currentOrg = userOrgs.find(org => org.organization_id === requestedOrgId);
            }
            
            // Fallback to first organization if none specified or not found
            if (!currentOrg && userOrgs.length > 0) {
              currentOrg = userOrgs[0];
            }
            
            if (currentOrg) {
              user.currentOrganizationId = currentOrg.organization_id;
              user.currentOrganization = currentOrg.organization;
              user.currentOrganizationRole = currentOrg.role.toUpperCase();
              user.currentOrganizationPermissions = currentOrg.permissions || [];
              
              logger.info('Set current organization context', {
                userId: user.id,
                currentOrganizationId: user.currentOrganizationId,
                currentOrganizationRole: user.currentOrganizationRole
              });
            } else {
              logger.warn('No current organization found for user', { userId: user.id });
            }
          } else {
            // Use role from public.users table as fallback when no organizations
            user.role = userData.role ? userData.role.toUpperCase() : 'VIEWER';
            user.organizationRoles = [];
            user.currentOrganizationId = null;
          }
        } catch (orgError) {
          logger.warn('Could not fetch user organization roles', {
            userId: user.id,
            error: orgError.message
          });
          // Use role from public.users table as fallback when org query fails
          user.role = userData.role ? userData.role.toUpperCase() : 'VIEWER';
          user.organizationRoles = [];
          user.currentOrganizationId = null;
        }
      } else {
        // If no profile found, try to self-heal by creating the user in public.users
        logger.warn('User profile not found in database, attempting to self-heal', { userId: user.id });
        try {
          const { data: newUserInstance, error: createError } = await supabase
            .from('users')
            .insert({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email.split('@')[0],
              role: 'employee',
              is_active: true,
              password_hash: 'managed_by_supabase_auth' // Required by DB structure
            })
            .select()
            .single();
            
          if (!createError && newUserInstance) {
            logger.info('Self-healed missing user profile', { userId: user.id });
            user.profile = newUserInstance;
          } else {
            logger.error('Failed to self-heal missing user profile', { userId: user.id, error: createError?.message });
          }
        } catch (healError) {
          logger.error('Exception during user profile self-healing', { userId: user.id, error: healError.message });
        }

        // Assign default role fallback
        user.role = 'VIEWER';
        user.isActive = true;
        user.organizationRoles = [];
      }
    } catch (dbError) {
      logger.warn('Could not fetch user profile data', {
        userId: user.id,
        error: dbError.message
      });
      // Assign default values if database query fails
      user.role = 'VIEWER';
      user.isActive = true;
      user.organizationRoles = [];
    }
    
    req.user = user;
    
    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    return res.status(500).json({ 
      error: 'Internal authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.user = user;
    }
  } catch (error) {
    logger.warn('Optional authentication failed', { error: error.message });
  }
  
  next();
};

module.exports = { 
  authenticateUser, 
  optionalAuth,
  supabase 
};