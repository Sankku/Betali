import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface SyncEvent {
  id: string;
  type: 'user_update' | 'role_change' | 'organization_switch' | 'auth_change' | 'manual_sync';
  message: string;
  timestamp: number;
}

interface GlobalSyncState {
  isLoading: boolean;
  loadingMessage: string;
  lastSync: number | null;
  syncEvents: SyncEvent[];
  
  // Loading control
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  
  // Sync triggers
  triggerUserDataSync: (reason?: string) => Promise<void>;
  triggerRoleSync: (reason?: string) => Promise<void>;
  triggerOrganizationSync: (reason?: string) => Promise<void>;
  triggerFullSync: (reason?: string) => Promise<void>;
  
  // Event logging
  addSyncEvent: (event: Omit<SyncEvent, 'id' | 'timestamp'>) => void;
  clearSyncEvents: () => void;
}

const GlobalSyncContext = createContext<GlobalSyncState | undefined>(undefined);

export const useGlobalSync = () => {
  const context = useContext(GlobalSyncContext);
  if (context === undefined) {
    throw new Error('useGlobalSync must be used within a GlobalSyncProvider');
  }
  return context;
};

interface GlobalSyncProviderProps {
  children: React.ReactNode;
}

export const GlobalSyncProvider: React.FC<GlobalSyncProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addSyncEvent = useCallback((event: Omit<SyncEvent, 'id' | 'timestamp'>) => {
    const newEvent: SyncEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    
    setSyncEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep last 10 events
    console.log('🔄 Sync Event:', newEvent);
  }, []);

  const clearSyncEvents = useCallback(() => {
    setSyncEvents([]);
  }, []);

  const showLoading = useCallback((message = 'Synchronizing...') => {
    setLoadingMessage(message);
    setIsLoading(true);
    
    // Auto-hide loading after 10 seconds as fallback
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 10000);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('Loading...');
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
  }, []);

  const refreshSupabaseSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('Could not refresh Supabase session:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Error refreshing Supabase session:', error);
      return false;
    }
  }, []);

  const triggerUserDataSync = useCallback(async (reason = 'User data sync requested') => {
    showLoading('Synchronizing user data...');
    addSyncEvent({ type: 'user_update', message: reason });

    try {
      // Refresh session first
      await refreshSupabaseSession();
      
      // Clear and invalidate user-related queries
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      queryClient.removeQueries({ queryKey: ['user-context'] });
      
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['user-context'] });
      
      // Wait a bit for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLastSync(Date.now());
      addSyncEvent({ type: 'user_update', message: 'User data synchronized successfully' });
    } catch (error) {
      console.error('Error syncing user data:', error);
      addSyncEvent({ type: 'user_update', message: `User sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, addSyncEvent, queryClient, refreshSupabaseSession]);

  const triggerRoleSync = useCallback(async (reason = 'Role sync requested') => {
    showLoading('Synchronizing roles and permissions...');
    addSyncEvent({ type: 'role_change', message: reason });

    try {
      // Refresh session first
      await refreshSupabaseSession();
      
      // Clear role-related queries
      queryClient.removeQueries({ queryKey: ['user-context'] });
      queryClient.removeQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['organizations'] });
      
      await queryClient.invalidateQueries({ queryKey: ['user-context'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      // Wait for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setLastSync(Date.now());
      addSyncEvent({ type: 'role_change', message: 'Roles and permissions synchronized successfully' });
    } catch (error) {
      console.error('Error syncing roles:', error);
      addSyncEvent({ type: 'role_change', message: `Role sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, addSyncEvent, queryClient, refreshSupabaseSession]);

  const triggerOrganizationSync = useCallback(async (reason = 'Organization sync requested') => {
    showLoading('Synchronizing organization data...');
    addSyncEvent({ type: 'organization_switch', message: reason });

    try {
      // Refresh session first
      await refreshSupabaseSession();
      
      // Clear organization-related queries
      queryClient.removeQueries({ queryKey: ['organizations'] });
      queryClient.removeQueries({ queryKey: ['user-context'] });
      queryClient.removeQueries({ queryKey: ['users'] });
      
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      await queryClient.invalidateQueries({ queryKey: ['user-context'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Wait for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setLastSync(Date.now());
      addSyncEvent({ type: 'organization_switch', message: 'Organization data synchronized successfully' });
    } catch (error) {
      console.error('Error syncing organization:', error);
      addSyncEvent({ type: 'organization_switch', message: `Organization sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, addSyncEvent, queryClient, refreshSupabaseSession]);

  const triggerFullSync = useCallback(async (reason = 'Full sync requested') => {
    showLoading('Performing full synchronization...');
    addSyncEvent({ type: 'manual_sync', message: reason });

    try {
      // Refresh session first
      const sessionRefreshed = await refreshSupabaseSession();
      
      if (sessionRefreshed) {
        addSyncEvent({ type: 'auth_change', message: 'Supabase session refreshed' });
      }
      
      // Clear all relevant queries
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      queryClient.removeQueries({ queryKey: ['user-context'] });
      queryClient.removeQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['organizations'] });
      
      // Invalidate all queries to force fresh data
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['user-context'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      // Wait for all queries to refetch
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLastSync(Date.now());
      addSyncEvent({ type: 'manual_sync', message: 'Full synchronization completed successfully' });
    } catch (error) {
      console.error('Error performing full sync:', error);
      addSyncEvent({ type: 'manual_sync', message: `Full sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, addSyncEvent, queryClient, refreshSupabaseSession]);

  const value = {
    isLoading,
    loadingMessage,
    lastSync,
    syncEvents,
    showLoading,
    hideLoading,
    triggerUserDataSync,
    triggerRoleSync,
    triggerOrganizationSync,
    triggerFullSync,
    addSyncEvent,
    clearSyncEvents,
  };

  return (
    <GlobalSyncContext.Provider value={value}>
      {children}
    </GlobalSyncContext.Provider>
  );
};