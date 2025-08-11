import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
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
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [switching, setSwitching] = useState(false);

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
  const canAccessUsersSection = currentUserRole === 'super_admin' || 
                                currentUserRole === 'admin' || 
                                currentUserRole === 'manager';


  // Use TanStack Query to fetch user organizations
  const { 
    data: userOrganizations = [], 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => apiService.organizations.getUserOrganizations(),
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Initialize organization context when data is available
  useEffect(() => {
    if (user && userOrganizations.length > 0) {
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
      }
    } else if (user && !isLoading && userOrganizations.length === 0) {
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
  }, [user, userOrganizations, isLoading]);

  const switchOrganization = async (organizationId: string) => {
    setSwitching(true);
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
      
      console.log('Switched to organization:', context.organization.name);
      
      // Dispatch custom event for other parts of the app to listen to
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organization: context.organization, userRole: context.userRole } 
      }));
      
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    } finally {
      setSwitching(false);
    }
  };

  const createOrganization = async (data: { name: string; slug: string }): Promise<Organization> => {
    try {
      const newOrg = await apiService.organizations.createOrganization(data);
      
      if (!newOrg?.organization_id) {
        throw new Error('Invalid organization created');
      }
      
      // Note: TanStack Query will automatically refetch when we switch to the new organization
      // Switch to the new organization
      await switchOrganization(newOrg.organization_id);
      
      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (currentPermissions.includes('*')) {
      return true; // Super admin has all permissions
    }
    
    return currentPermissions.includes(permission);
  };

  const value: OrganizationContextState = {
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
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};