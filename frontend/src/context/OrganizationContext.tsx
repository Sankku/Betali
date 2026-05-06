// Dependency order (must not be reversed — circular imports will crash bundler):
//   QueryClientProvider → AuthContext → GlobalSyncContext → OrganizationContext
// OrganizationContext must NEVER be imported by AuthContext or GlobalSyncContext.
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

  // Default org preference
  defaultOrganizationId: string | null;

  // Loading states
  loading: boolean;
  switching: boolean;
  accountDeactivated: boolean;

  // Actions
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (data: { name: string; slug: string }) => Promise<Organization>;
  setDefaultOrganization: (organizationId: string | null) => void;


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

// Synchronously reads a valid OrganizationContext from localStorage.
// Returns null if the stored data is missing or corrupt (and cleans up in that case).
function readStoredOrgContext(): {
  organization: Organization;
  userRole: UserRole;
  permissions: string[];
} | null {
  try {
    const stored = localStorage.getItem('currentOrganizationContext');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed?.organization?.organization_id) {
      // Corrupt entry — clean up both keys
      localStorage.removeItem('currentOrganizationContext');
      localStorage.removeItem('currentOrganizationId');
      return null;
    }
    // Keep localStorage in sync (context may have been set without the plain ID key)
    localStorage.setItem('currentOrganizationId', parsed.organization.organization_id);
    return parsed as { organization: Organization; userRole: UserRole; permissions: string[] };
  } catch {
    localStorage.removeItem('currentOrganizationContext');
    localStorage.removeItem('currentOrganizationId');
    return null;
  }
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showLoading, hideLoading } = useGlobalSync();

  // Initialise synchronously from localStorage so the org ID is available
  // in httpClient.getHeaders() before the first async fetch completes.
  // We call readStoredOrgContext() once and cache the result in a ref so the
  // three useState lazy-initializers share the same parsed object.
  const storedCtxRef = useRef(readStoredOrgContext());
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(
    () => storedCtxRef.current?.organization ?? null
  );
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(
    () => storedCtxRef.current?.userRole ?? null
  );
  const [currentPermissions, setCurrentPermissions] = useState<string[]>(
    () => storedCtxRef.current?.permissions ?? []
  );
  const [switching, setSwitching] = useState(false);
  const [defaultOrganizationId, setDefaultOrganizationIdState] = useState<string | null>(
    () => localStorage.getItem('defaultOrganizationId')
  );
  // If we restored a valid context from localStorage, mark as already initialised
  // synchronously so the init effect below doesn't override it before the fetch completes.
  const isInitializedRef = useRef(storedCtxRef.current !== null);
  // Prevent the init effect from overriding state set by an in-flight switchOrganization call.
  const isSwitchingRef = useRef(false);

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
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes — deduplicates with useOrganizationManagement hook
    retry: 2,
  });


  // Initialize organization context when data is available
  useEffect(() => {
    if (!user || isLoading) return;
    // Don't override state that switchOrganization is actively setting
    if (isSwitchingRef.current) return;

    if (userOrganizations.length > 0) {
      if (!isInitializedRef.current) {
        // Priority order for selecting the initial organization:
        // 1. defaultOrganizationId — explicitly pinned by the user
        // 2. currentOrganizationId — last used session
        // 3. First org in the list — fallback
        const defaultOrgId = localStorage.getItem('defaultOrganizationId');
        const lastUsedOrgId = localStorage.getItem('currentOrganizationId');
        let selectedOrg: UserOrganizationWithDetails | null = null;

        for (const candidateId of [defaultOrgId, lastUsedOrgId]) {
          if (candidateId) {
            selectedOrg = userOrganizations.find((org: UserOrganizationWithDetails) =>
              org?.organization?.organization_id === candidateId
            ) || null;
            if (selectedOrg) break;
          }
        }

        // Fallback: first available org
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
    isSwitchingRef.current = true;
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

      // Validate the response shape before applying state (BUG-013)
      if (
        !context ||
        typeof context !== 'object' ||
        !context.organization?.organization_id ||
        !context.userRole ||
        !Array.isArray(context.permissions)
      ) {
        throw new Error('Invalid context received from switch operation');
      }

      // Write localStorage BEFORE state setters so that any request fired during
      // the subsequent re-render already carries the new org ID in the header.
      localStorage.setItem('currentOrganizationId', organizationId);
      localStorage.setItem('currentOrganizationContext', JSON.stringify({
        organization: context.organization,
        userRole: context.userRole,
        permissions: context.permissions
      }));

      setCurrentOrganization(context.organization);
      setCurrentUserRole(context.userRole);
      setCurrentPermissions(context.permissions || []);
      isInitializedRef.current = true;

      // Invalidate only queries that are scoped to the previous organization.
      // Using a predicate avoids a flood of 40+ simultaneous refetches.
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          // Keep auth/user/org-level queries as-is; invalidate data queries
          const preservedKeys = ['user-organizations', 'currentUser', 'user-context', 'all-organizations'];
          if (Array.isArray(key) && typeof key[0] === 'string') {
            return !preservedKeys.includes(key[0]);
          }
          return false;
        },
      });
      
      // Dispatch custom event for other parts of the app to listen to
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organization: context.organization, userRole: context.userRole } 
      }));

    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    } finally {
      isSwitchingRef.current = false;
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

      // Refetch user organizations and wait for it — propagate errors to the caller.
      await queryClient.refetchQueries({ queryKey: ['user-organizations'] });

      // Read the now-fresh data from the cache.
      const updatedUserOrgs = queryClient.getQueryData<typeof userOrganizations>(['user-organizations']) ?? [];

      const newOrgInList = updatedUserOrgs.find(org =>
        org.organization?.organization_id === newOrg.organization_id
      );

      if (newOrgInList) {
        localStorage.setItem('currentOrganizationId', newOrg.organization_id);
        localStorage.setItem('currentOrganizationContext', JSON.stringify({
          organization: newOrg,
          userRole: newOrgInList.role.toUpperCase(),
          permissions: newOrgInList.permissions || []
        }));

        setCurrentOrganization(newOrg);
        setCurrentUserRole(newOrgInList.role.toUpperCase());
        setCurrentPermissions(newOrgInList.permissions || []);
      } else {
        // New org not yet in the list — use owner defaults while the query refreshes.
        localStorage.setItem('currentOrganizationId', newOrg.organization_id);
        localStorage.setItem('currentOrganizationContext', JSON.stringify({
          organization: newOrg,
          userRole: 'SUPER_ADMIN',
          permissions: ['*']
        }));

        setCurrentOrganization(newOrg);
        setCurrentUserRole('SUPER_ADMIN');
        setCurrentPermissions(['*']);
      }
      isInitializedRef.current = true;

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

  const setDefaultOrganization = useCallback((organizationId: string | null) => {
    if (organizationId) {
      localStorage.setItem('defaultOrganizationId', organizationId);
    } else {
      localStorage.removeItem('defaultOrganizationId');
    }
    setDefaultOrganizationIdState(organizationId);
  }, []);

  const accountDeactivated = useMemo(() => {
    const msg = (error as Error | null)?.message ?? '';
    return msg.toLowerCase().includes('deactivated');
  }, [error]);

  const value: OrganizationContextState = useMemo(() => ({
    currentOrganization,
    currentUserRole,
    currentPermissions,
    userOrganizations,
    defaultOrganizationId,
    loading: isLoading,
    switching,
    accountDeactivated,
    switchOrganization,
    createOrganization,
    setDefaultOrganization,
    hasPermission,
    canAccessUsersSection,
  }), [
    currentOrganization,
    currentUserRole,
    currentPermissions,
    userOrganizations,
    defaultOrganizationId,
    isLoading,
    switching,
    accountDeactivated,
    switchOrganization,
    createOrganization,
    setDefaultOrganization,
    hasPermission,
    canAccessUsersSection,
  ]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};