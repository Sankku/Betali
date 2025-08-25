import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';
import { UserRole } from '../utils/roleUtils';

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

interface UserContextSwitcherType {
  currentUserContext: UserProfile | null;
  availableUsers: UserProfile[];
  loading: boolean;
  switchToUser: (user: UserProfile) => void;
  canAccessUsersSection: boolean;
}

const UserContextSwitcherContext = createContext<UserContextSwitcherType | undefined>(undefined);

export const useUserContextSwitcher = () => {
  const context = useContext(UserContextSwitcherContext);
  if (context === undefined) {
    throw new Error('useUserContextSwitcher must be used within a UserContextSwitcherProvider');
  }
  return context;
};

interface UserContextSwitcherProviderProps {
  children: React.ReactNode;
}

export const UserContextSwitcherProvider: React.FC<UserContextSwitcherProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentUserContext, setCurrentUserContext] = useState<UserProfile | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUserContext');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing stored user context:', e);
        }
      }
    }
    return null;
  });

  // Use TanStack Query to fetch users - only when user is authenticated
  const { 
    data: usersResponse, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.users.getAll(),
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
  });

  const availableUsers = usersResponse?.data || [];

  // Check if current user can access users section based on their role
  const canAccessUsersSection = currentUserContext?.role === 'super_admin' || 
                                currentUserContext?.role === 'admin' || 
                                currentUserContext?.role === 'manager';

  // Update current user context when users data changes
  useEffect(() => {
    if (user && availableUsers.length > 0) {
      // Find current authenticated user's profile
      const currentProfile = availableUsers.find((u: UserProfile) => u.user_id === user?.id);
      
      if (currentProfile) {
        setCurrentUserContext(currentProfile);
        localStorage.setItem('currentUserContext', JSON.stringify(currentProfile));
        console.log('User context updated from fresh data');
      } else if (!currentUserContext) {
        console.warn('Current user profile not found in database');
      }
    }
  }, [user, availableUsers, currentUserContext]);

  const switchToUser = (targetUser: UserProfile) => {
    // Update the current context
    setCurrentUserContext(targetUser);
    
    // Store in localStorage for persistence
    localStorage.setItem('currentUserContext', JSON.stringify(targetUser));
    
    console.log('Switched to user context:', targetUser);
    
    // Dispatch custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('userContextChanged', { 
      detail: { user: targetUser } 
    }));
  };

  const value = {
    currentUserContext,
    availableUsers,
    loading: isLoading,
    switchToUser,
    canAccessUsersSection,
  };

  return (
    <UserContextSwitcherContext.Provider value={value}>
      {children}
    </UserContextSwitcherContext.Provider>
  );
};