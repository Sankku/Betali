const { Logger } = require('../utils/Logger');

const logger = new Logger('Permissions');

/**
 * Enhanced permission system for granular access control
 * Supports resource-based and action-based permissions
 */

// Define available permissions
const PERMISSIONS = {
  // Product permissions
  PRODUCTS_READ: 'products:read',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_SEARCH: 'products:search',
  
  // Warehouse permissions
  WAREHOUSES_READ: 'warehouses:read',
  WAREHOUSES_CREATE: 'warehouses:create',
  WAREHOUSES_UPDATE: 'warehouses:update',
  WAREHOUSES_DELETE: 'warehouses:delete',
  
  // Stock movement permissions
  STOCK_MOVEMENTS_READ: 'stock_movements:read',
  STOCK_MOVEMENTS_CREATE: 'stock_movements:create',
  STOCK_MOVEMENTS_UPDATE: 'stock_movements:update',
  STOCK_MOVEMENTS_DELETE: 'stock_movements:delete',
  
  // Dashboard permissions
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_ANALYTICS: 'dashboard:analytics',
  
  // User management permissions
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  
  // Organization management permissions
  ORGANIZATIONS_READ: 'organizations:read',
  ORGANIZATIONS_CREATE: 'organizations:create',
  ORGANIZATIONS_UPDATE: 'organizations:update',
  ORGANIZATIONS_DELETE: 'organizations:delete',
  ORGANIZATIONS_MEMBERS: 'organizations:members',
  
  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_AUDIT: 'admin:audit'
};

// Define user roles with their permissions
const ROLES = {
  SUPER_ADMIN: {
    name: 'Super Administrator',
    permissions: Object.values(PERMISSIONS)
  },
  ADMIN: {
    name: 'Administrator',
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.PRODUCTS_DELETE,
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.WAREHOUSES_CREATE,
      PERMISSIONS.WAREHOUSES_UPDATE,
      PERMISSIONS.WAREHOUSES_DELETE,
      PERMISSIONS.STOCK_MOVEMENTS_READ,
      PERMISSIONS.STOCK_MOVEMENTS_CREATE,
      PERMISSIONS.STOCK_MOVEMENTS_UPDATE,
      PERMISSIONS.STOCK_MOVEMENTS_DELETE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.ORGANIZATIONS_READ,
      PERMISSIONS.ORGANIZATIONS_CREATE,
      PERMISSIONS.ORGANIZATIONS_UPDATE,
      PERMISSIONS.ORGANIZATIONS_MEMBERS,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.DASHBOARD_ANALYTICS,
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_SYSTEM
    ]
  },
  MANAGER: {
    name: 'Manager',
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.WAREHOUSES_CREATE,
      PERMISSIONS.WAREHOUSES_UPDATE,
      PERMISSIONS.STOCK_MOVEMENTS_READ,
      PERMISSIONS.STOCK_MOVEMENTS_CREATE,
      PERMISSIONS.STOCK_MOVEMENTS_UPDATE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ORGANIZATIONS_READ,
      PERMISSIONS.ORGANIZATIONS_MEMBERS,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.DASHBOARD_ANALYTICS
    ]
  },
  EMPLOYEE: {
    name: 'Employee', 
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.STOCK_MOVEMENTS_READ,
      PERMISSIONS.STOCK_MOVEMENTS_CREATE,
      PERMISSIONS.DASHBOARD_READ
    ]
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.WAREHOUSES_READ,
      PERMISSIONS.STOCK_MOVEMENTS_READ,
      PERMISSIONS.DASHBOARD_READ
    ]
  }
};

/**
 * Check if user has required permission
 * @param {string} userRole - User's role
 * @param {string} permission - Required permission
 * @returns {boolean} - Has permission
 */
function hasPermission(userRole, permission) {
  const role = ROLES[userRole?.toUpperCase()];
  if (!role) {
    logger.warn('Unknown user role', { userRole });
    return false;
  }
  
  return role.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 * @param {string} userRole - User's role
 * @param {string[]} permissions - Array of required permissions
 * @returns {boolean} - Has any permission
 */
function hasAnyPermission(userRole, permissions) {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if user has all required permissions
 * @param {string} userRole - User's role
 * @param {string[]} permissions - Array of required permissions
 * @returns {boolean} - Has all permissions
 */
function hasAllPermissions(userRole, permissions) {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Middleware to require specific permission
 * @param {string} permission - Required permission
 * @returns {Function} - Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Permission check failed: No authenticated user', {
        permission,
        ip: req.ip,
        url: req.originalUrl
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        timestamp: new Date().toISOString()
      });
    }

    const userRole = req.user.role || 'VIEWER'; // Default to viewer if no role
    
    if (!hasPermission(userRole, permission)) {
      logger.warn('Permission check failed: Insufficient permissions', {
        userId: req.user.id,
        userRole,
        requiredPermission: permission,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource',
        requiredPermission: permission,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Permission check passed', {
      userId: req.user.id,
      userRole,
      permission,
      url: req.originalUrl
    });

    next();
  };
}

/**
 * Middleware to require any of the specified permissions
 * @param {string[]} permissions - Array of acceptable permissions
 * @returns {Function} - Express middleware
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        timestamp: new Date().toISOString()
      });
    }

    const userRole = req.user.role || 'VIEWER';
    
    if (!hasAnyPermission(userRole, permissions)) {
      logger.warn('Permission check failed: No matching permissions', {
        userId: req.user.id,
        userRole,
        requiredPermissions: permissions,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource',
        requiredPermissions: permissions,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Resource ownership check middleware
 * Ensures user can only access their own resources
 * @param {string} resourceIdParam - Parameter name containing resource ID
 * @param {Function} getResourceOwner - Function to get resource owner ID
 * @returns {Function} - Express middleware
 */
function requireResourceOwnership(resourceIdParam, getResourceOwner) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          timestamp: new Date().toISOString()
        });
      }

      const ownerId = await getResourceOwner(resourceId);
      
      if (ownerId !== req.user.id) {
        logger.warn('Resource ownership check failed', {
          userId: req.user.id,
          resourceId,
          ownerId,
          url: req.originalUrl
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own resources',
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check error', {
        error: error.message,
        userId: req.user?.id,
        resourceId: req.params[resourceIdParam]
      });
      
      return res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Get user permissions for response
 * @param {string} userRole - User's role
 * @returns {Object} - Permissions object
 */
function getUserPermissions(userRole) {
  const role = ROLES[userRole?.toUpperCase()];
  if (!role) {
    return { role: 'VIEWER', permissions: ROLES.VIEWER.permissions };
  }
  
  return {
    role: userRole.toUpperCase(),
    roleName: role.name,
    permissions: role.permissions
  };
}

module.exports = {
  PERMISSIONS,
  ROLES,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireResourceOwnership,
  getUserPermissions
};