import { useMemo } from 'react';
import { useUserContext } from './useUsers';

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { data: userContext, isLoading, error } = useUserContext();

  const permissions = useMemo(() => {
    if (!userContext || error) {
      return {
        permissions: [],
        role: '',
        roleName: '',
      };
    }
    return userContext.permissions;
  }, [userContext, error]);

  const hasPermission = (permission: string): boolean => {
    if (isLoading || !permissions) return false;
    return permissions.permissions.includes(permission);
  };

  const hasAnyPermission = (permissionsList: string[]): boolean => {
    if (isLoading || !permissions) return false;
    return permissionsList.some(permission => permissions.permissions.includes(permission));
  };

  const hasAllPermissions = (permissionsList: string[]): boolean => {
    if (isLoading || !permissions) return false;
    return permissionsList.every(permission => permissions.permissions.includes(permission));
  };

  const hasRole = (role: string): boolean => {
    if (isLoading || !permissions) return false;
    return permissions.role.toLowerCase() === role.toLowerCase();
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (isLoading || !permissions) return false;
    return roles.some(role => permissions.role.toLowerCase() === role.toLowerCase());
  };

  const canAccess = {
    // Products
    viewProducts: () => hasPermission('products:read'),
    createProducts: () => hasPermission('products:create'),
    updateProducts: () => hasPermission('products:update'),
    deleteProducts: () => hasPermission('products:delete'),
    searchProducts: () => hasPermission('products:search'),
    
    // Warehouses
    viewWarehouses: () => hasPermission('warehouses:read'),
    createWarehouses: () => hasPermission('warehouses:create'),
    updateWarehouses: () => hasPermission('warehouses:update'),
    deleteWarehouses: () => hasPermission('warehouses:delete'),
    
    // Stock Movements
    viewStockMovements: () => hasPermission('stock_movements:read'),
    createStockMovements: () => hasPermission('stock_movements:create'),
    updateStockMovements: () => hasPermission('stock_movements:update'),
    deleteStockMovements: () => hasPermission('stock_movements:delete'),
    
    // Users
    viewUsers: () => hasPermission('users:read'),
    createUsers: () => hasPermission('users:create'),
    updateUsers: () => hasPermission('users:update'),
    deleteUsers: () => hasPermission('users:delete'),
    
    // Organizations
    viewOrganizations: () => hasPermission('organizations:read'),
    createOrganizations: () => hasPermission('organizations:create'),
    updateOrganizations: () => hasPermission('organizations:update'),
    deleteOrganizations: () => hasPermission('organizations:delete'),
    manageOrganizationMembers: () => hasPermission('organizations:members'),
    
    // Clients
    viewClients: () => hasPermission('clients:read'),
    createClients: () => hasPermission('clients:create'),
    updateClients: () => hasPermission('clients:update'),
    deleteClients: () => hasPermission('clients:delete'),
    
    // Suppliers
    viewSuppliers: () => hasPermission('suppliers:read'),
    createSuppliers: () => hasPermission('suppliers:create'),
    updateSuppliers: () => hasPermission('suppliers:update'),
    deleteSuppliers: () => hasPermission('suppliers:delete'),
    
    // Dashboard
    viewDashboard: () => hasPermission('dashboard:read'),
    viewAnalytics: () => hasPermission('dashboard:analytics'),
    
    // Admin
    adminUsers: () => hasPermission('admin:users'),
    adminSystem: () => hasPermission('admin:system'),
    adminAudit: () => hasPermission('admin:audit'),
    
    // Utility functions
    isAdmin: () => hasAnyRole(['admin', 'super_admin']),
    isSuperAdmin: () => hasRole('super_admin'),
    isManager: () => hasAnyRole(['manager', 'admin', 'super_admin']),
    isEmployee: () => hasAnyRole(['employee', 'manager', 'admin', 'super_admin']),
    isViewer: () => hasRole('viewer'),
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canAccess,
    isLoading,
    error,
    userContext,
  };
}