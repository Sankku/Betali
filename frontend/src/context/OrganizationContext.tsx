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
          console.log('Cleaning up corrupted organization context');
          localStorage.removeItem('currentOrganizationContext');
          localStorage.removeItem('currentOrganizationId');
        }
      }
    } catch (e) {
      console.log('Cleaning up corrupted organization context');
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
        console.log('🔄 Fetching user organizations for user:', user?.email);
        const result = await apiService.organizations.getUserOrganizations();
        console.log('📊 User organizations loaded:', result.length, 'organizations', result);
        return result;
      } catch (err) {
        console.error('❌ Error fetching user organizations:', err);
        throw err;
      }
    },
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
  });

  // Debug logging for context state
  React.useEffect(() => {
    console.log('🔍 Organization Context State:', {
      isLoading,
      userOrganizationsCount: userOrganizations?.length || 0,
      currentOrganization: currentOrganization?.name || 'none',
      currentUserRole,
      error: error?.message || 'none'
    });
  }, [isLoading, userOrganizations, currentOrganization, currentUserRole, error]);

  // Initialize organization context when data is available
  useEffect(() => {
    if (!user || isLoading) return;
    
    // Only run when we have organizations and haven't initialized yet
    if (userOrganizations.length > 0 && !isInitializedRef.current) {
      // Check if there's a stored organization context
      const storedOrgId = localStorage.getItem('currentOrganizationId');
      let selectedOrg = null;
      
      if (storedOrgId) {
        selectedOrg = userOrganizations.find((org: UserOrganizationWithDetails) => 
          org?.organization?.organization_id === storedOrgId
        );
      }
      
      // If no stored context or organization not found, use the first available
      if (!selectedOrg && userOrganizations.length > 0) {
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
        
        console.log('Organization context updated:', selectedOrg.organization.name);
        isInitializedRef.current = true;
      }
    } else if (userOrganizations.length === 0 && !currentOrganization) {
      console.warn('No organizations found for user');
      
      // Try to load from localStorage as fallback
      const stored = localStorage.getItem('currentOrganizationContext');
      if (stored) {
        try {
          const parsedContext = JSON.parse(stored);
          if (parsedContext?.organization?.organization_id) {
            setCurrentOrganization(parsedContext.organization);
            setCurrentUserRole(parsedContext.userRole);
            setCurrentPermissions(parsedContext.permissions || []);
            console.log('Loaded organization context from localStorage');
            isInitializedRef.current = true;
          } else {
            console.warn('Invalid organization context in localStorage');
            localStorage.removeItem('currentOrganizationContext');
            localStorage.removeItem('currentOrganizationId');
          }
        } catch (e) {
          console.error('Error parsing stored organization context:', e);
          localStorage.removeItem('currentOrganizationContext');
          localStorage.removeItem('currentOrganizationId');
        }
      }
    }
  }, [user, userOrganizations.length, isLoading]);

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
    console.log('🔄 Attempting to switch to organization:', organizationId);
    setSwitching(true);
    showLoading('Switching organization...');
    try {
      // Find the organization in user's list
      const targetOrg = userOrganizations.find(
        org => org?.organization?.organization_id === organizationId
      );
      
      console.log('🔍 Target organization found:', targetOrg?.organization?.name || 'NOT FOUND');
      
      if (!targetOrg || !targetOrg.organization?.organization_id) {
        throw new Error('Organization not found in user organizations');
      }

      // Switch context
      console.log('🌐 Calling API to switch context...');
      const context = await apiService.organizations.switchContext(organizationId);
      
      console.log('📝 API response:', context);
      
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
      
      console.log('✅ Successfully switched to organization:', context.organization.name);
      
      // Invalidate all queries to refetch with new organization context
      console.log('🔄 Invalidating all queries for organization switch...');
      await queryClient.invalidateQueries();
      
      // Dispatch custom event for other parts of the app to listen to
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organization: context.organization, userRole: context.userRole } 
      }));
      
    } catch (error) {
      console.error('❌ Error switching organization:', error);
      throw error;
    } finally {
      setSwitching(false);
      hideLoading();
    }
  }, [userOrganizations, queryClient, showLoading, hideLoading]);

  const createOrganization = useCallback(async (data: { name: string; slug: string }): Promise<Organization> => {
    console.log('🏢 Creating new organization:', data);
    try {
      const newOrg = await apiService.organizations.create(data);
      
      console.log('📝 Organization created:', newOrg);
      
      if (!newOrg?.organization_id) {
        throw new Error('Invalid organization created');
      }
      
      // Invalidate the user organizations query to refetch the list
      console.log('🔄 Invalidating user organizations query...');
      await queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      
      // Switch to the new organization
      console.log('🔄 Switching to new organization...');
      await switchOrganization(newOrg.organization_id);
      
      console.log('✅ Organization creation complete');
      return newOrg;
    } catch (error) {
      console.error('❌ Error creating organization:', error);
      throw error;
    }
  }, [queryClient, switchOrganization]);

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