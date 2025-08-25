/**
 * Role display utilities
 * Maps technical role names to user-friendly display names
 */

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: 'Administrator',
  admin: 'Administrator',
  manager: 'Manager', 
  employee: 'Employee',
  viewer: 'Viewer'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full system access and organization management',
  admin: 'Full system access and organization management', 
  manager: 'Team management and advanced features',
  employee: 'Standard user access',
  viewer: 'Read-only access'
};

/**
 * Get user-friendly display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  return ROLE_DESCRIPTIONS[role] || 'Standard user access';
}

/**
 * Check if role has administrative privileges
 */
export function hasAdminPrivileges(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Check if role can manage users
 */
export function canManageUsers(role: UserRole): boolean {
  return hasAdminPrivileges(role) || role === 'manager';
}

/**
 * Get role priority for sorting (higher number = more privileges)
 */
export function getRolePriority(role: UserRole): number {
  const priorities: Record<UserRole, number> = {
    super_admin: 5,
    admin: 4,
    manager: 3,
    employee: 2,
    viewer: 1
  };
  return priorities[role] || 0;
}

/**
 * Role hierarchy and assignment rules
 */
export const ROLE_HIERARCHY = {
  // What roles each role can assign (excluding themselves)
  assignableRoles: {
    super_admin: ['admin', 'manager', 'employee', 'viewer'], // Can assign any role except super_admin
    admin: ['manager', 'employee', 'viewer'], // Cannot assign admin or super_admin
    manager: ['employee', 'viewer'], // Can only assign lower roles
    employee: [], // Cannot assign roles
    viewer: [] // Cannot assign roles
  },
  
  // What roles can manage (view/edit) other roles
  managementRights: {
    super_admin: ['super_admin', 'admin', 'manager', 'employee', 'viewer'], // Can manage all
    admin: ['admin', 'manager', 'employee', 'viewer'], // Cannot manage super_admin
    manager: ['manager', 'employee', 'viewer'], // Can manage equal or lower
    employee: [], // Cannot manage others
    viewer: [] // Cannot manage others
  }
};

/**
 * Check if current user can assign a specific role
 */
export function canAssignRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY.assignableRoles[currentUserRole]?.includes(targetRole) || false;
}

/**
 * Check if current user can manage (view/edit) a user with specific role
 */
export function canManageUserWithRole(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  return ROLE_HIERARCHY.managementRights[currentUserRole]?.includes(targetUserRole) || false;
}

/**
 * Get roles that current user can assign to others
 */
export function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  return ROLE_HIERARCHY.assignableRoles[currentUserRole] || [];
}

/**
 * Check if a role is protected (should not be assignable by most users)
 */
export function isProtectedRole(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Get role assignment restrictions info
 */
export function getRoleRestrictions(currentUserRole: UserRole) {
  const assignable = getAssignableRoles(currentUserRole);
  const protected_roles = ['super_admin'];
  
  return {
    canAssignRoles: assignable.length > 0,
    assignableRoles: assignable,
    protectedRoles: protected_roles,
    canManageUsers: canManageUsers(currentUserRole),
    hasAdminPrivileges: hasAdminPrivileges(currentUserRole)
  };
}