import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook to handle authentication state changes and clear cached data
 * when user logs in/out or switches accounts
 */
export function useAuthStateChange() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');

      // Clear all cached data when auth state changes
      if (event === 'SIGNED_OUT') {
        console.log('User signed out - clearing all query cache');
        queryClient.clear();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed - invalidating user-related queries');
        
        // Invalidate user-related queries to force fresh data
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['user-context'] });
        queryClient.invalidateQueries({ queryKey: ['organizations'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        
        // Also clear these queries completely to ensure fresh fetch
        queryClient.removeQueries({ queryKey: ['currentUser'] });
        queryClient.removeQueries({ queryKey: ['user-context'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);
}