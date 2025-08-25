import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY
  fallback?: React.ReactNode; // What to show when permission is denied
  loading?: React.ReactNode; // What to show while loading
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  loading = null,
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isLoading,
  } = usePermissions();

  if (isLoading) {
    return <>{loading}</>;
  }

  let hasAccess = true;

  // Check single permission
  if (permission) {
    hasAccess = hasPermission(permission);
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  // Check single role
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  // Check multiple roles
  if (roles && roles.length > 0) {
    hasAccess = hasAccess && hasAnyRole(roles);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that shows content ONLY if user has specific permissions
 */
export function ShowIfCan({
  children,
  ...props
}: PermissionGuardProps) {
  return (
    <PermissionGuard {...props} fallback={null}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Component that hides content if user DOESN'T have specific permissions
 */
export function HideIfCannot({
  children,
  ...props
}: PermissionGuardProps) {
  return (
    <PermissionGuard {...props}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Higher-order component for permission-based conditional rendering
 */
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissionConfig: Omit<PermissionGuardProps, 'children'>
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard {...permissionConfig}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}