import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useGlobalSync } from './GlobalSyncContext';
import { apiService } from '../services/api';
import { 
  Organization, 
  UserOrganizationWithDetails, 
  OrganizationContext as OrganizationContextType,
  UserRole 
} from '../types/organization';

interface OrganizationContextState {
  // Current state
  currentOrganization: Organization | null;
  currentUserRole: UserRole | null;
  currentPermissions: string[];
  
  // All user organizations
  userOrganizations: UserOrganizationWithDetails[];
  
  // Loading states
  loading: boolean;
  switching: boolean;
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (data: { name: string; slug: string }) => Promise<Organization>;
  
  // Utility functions
  hasPermission: (permission: string) => boolean;
  canAccessUsersSection: boolean;
}

const OrganizationContext = createContext<OrganizationContextState | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showLoading, hideLoading } = useGlobalSync();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [switching, setSwitching] = useState(false);
  const isInitializedRef = useRef(false);

  // Clean up potentially corrupted localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('currentOrganizationContext');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed?.organization?.organization_id) {
          localStorage.removeItem('currentOrganizationContext');
          localStorage.removeItem('currentOrganizationId');
        }
      }
    } catch (e) {
      localStorage.removeItem('currentOrganizationContext');
      localStorage.removeItem('currentOrganizationId');
    }
  }, []);

  // Check if current user can access users section based on their role
  const canAccessUsersSection = useMemo(() => 
    currentUserRole === 'super_admin' || 
    currentUserRole === 'admin' || 
    currentUserRole === 'manager',
    [currentUserRole]
  );


  // Use TanStack Query to fetch user organizations
  const {
    data: userOrganizations = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: async () => {
      try {
        const result = await apiService.organizations.getUserOrganizations();
        return result;
      } catch (err) {
        console.error('Error fetching user organizations:', err);
        throw err;
      }
    },
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 0, // Always consider data stale so fresh login always refetches
    refetchOnMount: 'always', // Always refetch when component mounts
    retry: 2,
  });


  // Initialize organization context when data is available
  useEffect(() => {
    if (!user || isLoading) return;

    if (userOrganizations.length > 0) {
      if (!isInitializedRef.current) {
        // First time initialization: pick the best organization to set as current
        const storedOrgId = localStorage.getItem('currentOrganizationId');
        let selectedOrg: UserOrganizationWithDetails | null = null;

        if (storedOrgId) {
          selectedOrg = userOrganizations.find((org: UserOrganizationWithDetails) =>
            org?.organization?.organization_id === storedOrgId
          ) || null;
        }

        // If no stored context or stored org not found, use the first available
        if (!selectedOrg) {
          const firstOrg = userOrganizations[0];
          if (firstOrg?.organization?.organization_id) {
            selectedOrg = firstOrg;
          }
        }

        if (selectedOrg && selectedOrg.organization && selectedOrg.organization.organization_id) {
          setCurrentOrganization(selectedOrg.organization);
          setCurrentUserRole(selectedOrg.userRole);
          setCurrentPermissions(selectedOrg.userPermissions || []);

          // Store the current organization
          localStorage.setItem('currentOrganizationId', selectedOrg.organization.organization_id);
          localStorage.setItem('currentOrganizationContext', JSON.stringify({
            organization: selectedOrg.organization,
            userRole: selectedOrg.userRole,
            permissions: selectedOrg.userPermissions || []
          }));

          isInitializedRef.current = true;
        }
      } else if (currentOrganization) {
        // Already initialized — check if the current org still exists (e.g. after deletion)
        const currentOrgExists = userOrganizations.some(userOrg =>
          userOrg?.organization?.organization_id === currentOrganization.organization_id
        );

        if (!currentOrgExists) {
          // Current organization was deleted, switch to first available
          const firstOrg = userOrganizations[0];
          if (firstOrg?.organization?.organization_id) {
            setCurrentOrganization(firstOrg.organization);
            setCurrentUserRole(firstOrg.userRole);
            setCurrentPermissions(firstOrg.userPermissions || []);

            localStorage.setItem('currentOrganizationId', firstOrg.organization.organization_id);
            localStorage.setItem('currentOrganizationContext', JSON.stringify({
              organization: firstOrg.organization,
              userRole: firstOrg.userRole,
              permissions: firstOrg.userPermissions || []
            }));
          }
        }
      }
    } else if (userOrganizations.length === 0 && !isLoading) {
      // Query finished with no organizations — clear context
      // Note: only clear after loading is done (isLoading === false) to avoid
      // clearing on intermediate empty states before data arrives
      setCurrentOrganization(null);
      setCurrentUserRole(null);
      setCurrentPermissions([]);

      // Clean up localStorage
      localStorage.removeItem('currentOrganizationContext');
      localStorage.removeItem('currentOrganizationId');

      // Mark initialized so we don't retry unnecessarily, but allow re-init
      // if orgs are added later (isInitializedRef stays false so next org creation works)
    }
  }, [user, userOrganizations, isLoading, currentOrganization]);

  // Reset initialization flag when user changes
  useEffect(() => {
    if (!user) {
      isInitializedRef.current = false;
      setCurrentOrganization(null);
      setCurrentUserRole(null);
      setCurrentPermissions([]);
    }
  }, [user]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    setSwitching(true);
    showLoading('Switching organization...');
    try {
      // Find the organization in user's list
      const targetOrg = userOrganizations.find(
        org => org?.organization?.organization_id === organizationId
      );

      if (!targetOrg || !targetOrg.organization?.organization_id) {
        throw new Error('Organization not found in user organizations');
      }

      // Switch context
      const context = await apiService.organizations.switchContext(organizationId);
      
      if (context?.organization?.organization_id) {
        setCurrentOrganization(context.organization);
        setCurrentUserRole(context.userRole);
        setCurrentPermissions(context.permissions || []);
      } else {
        throw new Error('Invalid context received from switch operation');
      }
      
      // Store the new context
      localStorage.setItem('currentOrganizationId', organizationId);
      localStorage.setItem('currentOrganizationContext', JSON.stringify({
        organization: context.organization,
        userRole: context.userRole,
        permissions: context.permissions
      }));

      // Invalidate all queries to refetch with new organization context
      await queryClient.invalidateQueries();
      
      // Dispatch custom event for other parts of the app to listen to
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organization: context.organization, userRole: context.userRole } 
      }));

    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    } finally {
      setSwitching(false);
      hideLoading();
    }
  }, [userOrganizations, queryClient, showLoading, hideLoading]);

  const createOrganization = useCallback(async (data: { name: string; slug: string }): Promise<Organization> => {
    try {
      const newOrg = await apiService.organizations.create(data);

      if (!newOrg?.organization_id) {
        throw new Error('Invalid organization created');
      }

      // Invalidate and wait for the user organizations query to refetch
      await queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      
      // Wait a bit for the query to refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Manually fetch the updated organizations to ensure we have the latest data
      try {
        const updatedUserOrgs = await apiService.organizations.getUserOrganizations();

        // Find the newly created organization in the updated list
        const newOrgInList = updatedUserOrgs.find(org =>
          org.organization?.organization_id === newOrg.organization_id
        );

        if (newOrgInList) {
          // Directly set the context without calling switchOrganization
          setCurrentOrganization(newOrg);
          setCurrentUserRole(newOrgInList.role.toUpperCase());
          setCurrentPermissions(newOrgInList.permissions || []);
          
          // Store the new context
          localStorage.setItem('currentOrganizationId', newOrg.organization_id);
          localStorage.setItem('currentUserRole', newOrgInList.role);
          localStorage.setItem('currentPermissions', JSON.stringify(newOrgInList.permissions || []));
        } else {
          // Fallback: set context directly from creation response
          setCurrentOrganization(newOrg);
          setCurrentUserRole('SUPER_ADMIN'); // Owner of new org
          setCurrentPermissions(['*']); // Full permissions for owner
          
          localStorage.setItem('currentOrganizationId', newOrg.organization_id);
          localStorage.setItem('currentUserRole', 'SUPER_ADMIN');
          localStorage.setItem('currentPermissions', JSON.stringify(['*']));
        }

      } catch (fetchError) {
        // Fallback: set context directly from creation response
        setCurrentOrganization(newOrg);
        setCurrentUserRole('SUPER_ADMIN');
        setCurrentPermissions(['*']);
        
        localStorage.setItem('currentOrganizationId', newOrg.organization_id);
        localStorage.setItem('currentUserRole', 'SUPER_ADMIN');
        localStorage.setItem('currentPermissions', JSON.stringify(['*']));
      }

      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }, [queryClient]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (currentPermissions.includes('*')) {
      return true; // Super admin has all permissions
    }
    
    return currentPermissions.includes(permission);
  }, [currentPermissions]);

  const value: OrganizationContextState = useMemo(() => ({
    currentOrganization,
    currentUserRole,
    currentPermissions,
    userOrganizations,
    loading: isLoading,
    switching,
    switchOrganization,
    createOrganization,
    hasPermission,
    canAccessUsersSection,
  }), [
    currentOrganization,
    currentUserRole,
    currentPermissions,
    userOrganizations,
    isLoading,
    switching,
    switchOrganization,
    createOrganization,
    hasPermission,
    canAccessUsersSection,
  ]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};