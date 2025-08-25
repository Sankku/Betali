const { createClient } = require('@supabase/supabase-js');
const { Logger } = require('../utils/Logger');
require('dotenv').config();

const logger = new Logger('AuthMiddleware');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
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
          const { data: userOrgs, error: orgError } = await supabase
            .from('user_organizations')
            .select('organization_id, role, permissions, organization:organizations(*)')
            .eq('user_id', user.id)
            .eq('is_active', true);

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
            }
          } else {
            user.role = 'VIEWER'; // Default if no organizations
            user.organizationRoles = [];
            user.currentOrganizationId = null;
          }
        } catch (orgError) {
          logger.warn('Could not fetch user organization roles', {
            userId: user.id,
            error: orgError.message
          });
          user.role = 'VIEWER';
          user.organizationRoles = [];
          user.currentOrganizationId = null;
        }
      } else {
        // If no profile found, assign default role
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