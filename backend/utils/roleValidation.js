/**
 * Role hierarchy validation utilities for backend
 * Ensures users can only assign roles they have permission for
 */

/**
 * Role hierarchy definitions
 * Higher roles can assign/manage lower roles
 */
const ROLE_HIERARCHY = {
  // What roles each role can assign (excluding themselves)
  assignableRoles: {
    super_admin: ['admin', 'manager', 'employee', 'viewer'],
    admin: ['manager', 'employee', 'viewer'], 
    manager: ['employee', 'viewer'],
    employee: [],
    viewer: []
  },
  
  // What roles can be managed by each role
  managementRights: {
    super_admin: ['super_admin', 'admin', 'manager', 'employee', 'viewer'],
    admin: ['admin', 'manager', 'employee', 'viewer'],
    manager: ['manager', 'employee', 'viewer'],
    employee: [],
    viewer: []
  }
};

/**
 * Protected roles that require special handling
 */
const PROTECTED_ROLES = ['super_admin'];

/**
 * Valid roles in the system
 */
const VALID_ROLES = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];

/**
 * Check if current user can assign a specific role
 * @param {string} currentUserRole - The role of the user making the assignment
 * @param {string} targetRole - The role being assigned
 * @returns {boolean} - Whether the assignment is allowed
 */
function canAssignRole(currentUserRole, targetRole) {
  if (!currentUserRole || !targetRole) return false;
  if (!VALID_ROLES.includes(currentUserRole) || !VALID_ROLES.includes(targetRole)) return false;
  
  const assignableRoles = ROLE_HIERARCHY.assignableRoles[currentUserRole] || [];
  return assignableRoles.includes(targetRole);
}

/**
 * Check if current user can manage a user with specific role
 * @param {string} currentUserRole - The role of the user performing management
 * @param {string} targetUserRole - The role of the user being managed
 * @returns {boolean} - Whether the management is allowed
 */
function canManageUserWithRole(currentUserRole, targetUserRole) {
  if (!currentUserRole || !targetUserRole) return false;
  if (!VALID_ROLES.includes(currentUserRole) || !VALID_ROLES.includes(targetUserRole)) return false;
  
  const managementRights = ROLE_HIERARCHY.managementRights[currentUserRole] || [];
  return managementRights.includes(targetUserRole);
}

/**
 * Check if a role is protected
 * @param {string} role - The role to check
 * @returns {boolean} - Whether the role is protected
 */
function isProtectedRole(role) {
  return PROTECTED_ROLES.includes(role);
}

/**
 * Validate role assignment request
 * @param {string} currentUserRole - Current user's role
 * @param {string} targetRole - Role being assigned
 * @param {Object} options - Additional validation options
 * @returns {Object} - Validation result with success and message
 */
function validateRoleAssignment(currentUserRole, targetRole, options = {}) {
  // Check if roles are valid
  if (!VALID_ROLES.includes(targetRole)) {
    return {
      success: false,
      error: 'Invalid role specified',
      code: 'INVALID_ROLE'
    };
  }
  
  if (!VALID_ROLES.includes(currentUserRole)) {
    return {
      success: false,
      error: 'Current user has invalid role',
      code: 'INVALID_CURRENT_ROLE'
    };
  }
  
  // Check if current user can assign this role
  if (!canAssignRole(currentUserRole, targetRole)) {
    return {
      success: false,
      error: `Users with role '${currentUserRole}' cannot assign role '${targetRole}'`,
      code: 'INSUFFICIENT_PERMISSIONS',
      details: {
        currentUserRole,
        targetRole,
        assignableRoles: ROLE_HIERARCHY.assignableRoles[currentUserRole] || []
      }
    };
  }
  
  // Special handling for protected roles
  if (isProtectedRole(targetRole) && currentUserRole !== 'super_admin') {
    return {
      success: false,
      error: `Role '${targetRole}' is protected and can only be assigned by super administrators`,
      code: 'PROTECTED_ROLE',
      details: {
        protectedRole: targetRole,
        requiredRole: 'super_admin'
      }
    };
  }
  
  return {
    success: true,
    message: `Role assignment validated: ${currentUserRole} can assign ${targetRole}`
  };
}

/**
 * Get assignable roles for current user
 * @param {string} currentUserRole - Current user's role
 * @returns {string[]} - Array of roles that can be assigned
 */
function getAssignableRoles(currentUserRole) {
  if (!VALID_ROLES.includes(currentUserRole)) return [];
  return ROLE_HIERARCHY.assignableRoles[currentUserRole] || [];
}

/**
 * Get role hierarchy information
 * @param {string} role - Role to get info for
 * @returns {Object} - Role hierarchy information
 */
function getRoleInfo(role) {
  return {
    role,
    isValid: VALID_ROLES.includes(role),
    isProtected: isProtectedRole(role),
    canAssign: getAssignableRoles(role),
    canManage: ROLE_HIERARCHY.managementRights[role] || []
  };
}

module.exports = {
  canAssignRole,
  canManageUserWithRole,
  isProtectedRole,
  validateRoleAssignment,
  getAssignableRoles,
  getRoleInfo,
  VALID_ROLES,
  PROTECTED_ROLES,
  ROLE_HIERARCHY
};