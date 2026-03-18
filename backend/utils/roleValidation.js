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
  const normalizedCurrent = currentUserRole.toLowerCase();
  const normalizedTarget = targetRole.toLowerCase();
  if (!VALID_ROLES.includes(normalizedCurrent) || !VALID_ROLES.includes(normalizedTarget)) return false;

  const assignableRoles = ROLE_HIERARCHY.assignableRoles[normalizedCurrent] || [];
  return assignableRoles.includes(normalizedTarget);
}

/**
 * Check if current user can manage a user with specific role
 * @param {string} currentUserRole - The role of the user performing management
 * @param {string} targetUserRole - The role of the user being managed
 * @returns {boolean} - Whether the management is allowed
 */
function canManageUserWithRole(currentUserRole, targetUserRole) {
  if (!currentUserRole || !targetUserRole) return false;
  const normalizedCurrent = currentUserRole.toLowerCase();
  const normalizedTarget = targetUserRole.toLowerCase();
  if (!VALID_ROLES.includes(normalizedCurrent) || !VALID_ROLES.includes(normalizedTarget)) return false;

  const managementRights = ROLE_HIERARCHY.managementRights[normalizedCurrent] || [];
  return managementRights.includes(normalizedTarget);
}

/**
 * Check if a role is protected
 * @param {string} role - The role to check
 * @returns {boolean} - Whether the role is protected
 */
function isProtectedRole(role) {
  return PROTECTED_ROLES.includes(role?.toLowerCase());
}

/**
 * Validate role assignment request
 * @param {string} currentUserRole - Current user's role
 * @param {string} targetRole - Role being assigned
 * @param {Object} options - Additional validation options
 * @returns {Object} - Validation result with success and message
 */
function validateRoleAssignment(currentUserRole, targetRole, options = {}) {
  const normalizedCurrent = currentUserRole?.toLowerCase();
  const normalizedTarget = targetRole?.toLowerCase();

  // Check if roles are valid
  if (!VALID_ROLES.includes(normalizedTarget)) {
    return {
      success: false,
      error: 'Invalid role specified',
      code: 'INVALID_ROLE'
    };
  }

  if (!VALID_ROLES.includes(normalizedCurrent)) {
    return {
      success: false,
      error: 'Current user has invalid role',
      code: 'INVALID_CURRENT_ROLE'
    };
  }

  // Check if current user can assign this role
  if (!canAssignRole(normalizedCurrent, normalizedTarget)) {
    return {
      success: false,
      error: `Users with role '${normalizedCurrent}' cannot assign role '${normalizedTarget}'`,
      code: 'INSUFFICIENT_PERMISSIONS',
      details: {
        currentUserRole: normalizedCurrent,
        targetRole: normalizedTarget,
        assignableRoles: ROLE_HIERARCHY.assignableRoles[normalizedCurrent] || []
      }
    };
  }

  // Special handling for protected roles
  if (isProtectedRole(normalizedTarget) && normalizedCurrent !== 'super_admin') {
    return {
      success: false,
      error: `Role '${targetRole}' is protected and can only be assigned by super administrators`,
      code: 'PROTECTED_ROLE',
      details: {
        protectedRole: normalizedTarget,
        requiredRole: 'super_admin'
      }
    };
  }

  return {
    success: true,
    message: `Role assignment validated: ${normalizedCurrent} can assign ${normalizedTarget}`
  };
}

/**
 * Get assignable roles for current user
 * @param {string} currentUserRole - Current user's role
 * @returns {string[]} - Array of roles that can be assigned
 */
function getAssignableRoles(currentUserRole) {
  const normalized = currentUserRole?.toLowerCase();
  if (!VALID_ROLES.includes(normalized)) return [];
  return ROLE_HIERARCHY.assignableRoles[normalized] || [];
}

/**
 * Get role hierarchy information
 * @param {string} role - Role to get info for
 * @returns {Object} - Role hierarchy information
 */
function getRoleInfo(role) {
  const normalized = role?.toLowerCase();
  return {
    role: normalized,
    isValid: VALID_ROLES.includes(normalized),
    isProtected: isProtectedRole(normalized),
    canAssign: getAssignableRoles(normalized),
    canManage: ROLE_HIERARCHY.managementRights[normalized] || []
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