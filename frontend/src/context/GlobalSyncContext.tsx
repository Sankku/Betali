import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

  // ── Supabase Realtime: invalidate React Query cache on external changes
  // This keeps the UI in sync when the Telegram bot (or any external source)
  // creates stock movements or purchase orders without a frontend mutation.
  useEffect(() => {
    const channel = supabase
      .channel('external-stock-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stock_movements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
          queryClient.invalidateQueries({ queryKey: ['warehouse-movements'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'purchase_orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const addSyncEvent = useCallback((event: Omit<SyncEvent, 'id' | 'timestamp'>) => {
    const newEvent: SyncEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    setSyncEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep last 10 events
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
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const triggerUserDataSync = useCallback(async (reason = 'User data sync requested') => {
    showLoading('Synchronizing user data...');
    addSyncEvent({ type: 'user_update', message: reason });

    try {
      // Refresh session first
      await refreshSupabaseSession();
      
      // Refetch user-related queries and wait for completion
      await queryClient.refetchQueries({ queryKey: ['currentUser'] });
      await queryClient.refetchQueries({ queryKey: ['user-context'] });

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
      
      // Refetch role-related queries and wait for completion
      await queryClient.refetchQueries({ queryKey: ['user-context'] });
      await queryClient.refetchQueries({ queryKey: ['users'] });
      await queryClient.refetchQueries({ queryKey: ['organizations'] });

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
      
      // Refetch organization-related queries and wait for completion
      await queryClient.refetchQueries({ queryKey: ['organizations'] });
      await queryClient.refetchQueries({ queryKey: ['user-context'] });
      await queryClient.refetchQueries({ queryKey: ['users'] });

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
      
      // Refetch all critical queries concurrently and wait for completion
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['currentUser'] }),
        queryClient.refetchQueries({ queryKey: ['user-context'] }),
        queryClient.refetchQueries({ queryKey: ['users'] }),
        queryClient.refetchQueries({ queryKey: ['organizations'] }),
      ]);

      setLastSync(Date.now());
      addSyncEvent({ type: 'manual_sync', message: 'Full synchronization completed successfully' });
    } catch (error) {
      console.error('Error performing full sync:', error);
      addSyncEvent({ type: 'manual_sync', message: `Full sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, addSyncEvent, queryClient, refreshSupabaseSession]);

  const value = useMemo(() => ({
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
  }), [
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
  ]);

  return (
    <GlobalSyncContext.Provider value={value}>
      {children}
    </GlobalSyncContext.Provider>
  );
};