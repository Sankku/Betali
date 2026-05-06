import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook to handle authentication state changes and clear cached data
 * when user logs in/out or switches accounts.
 *
 * We track the last known userId so that repeated SIGNED_IN / TOKEN_REFRESHED
 * events fired by Supabase on tab focus do NOT wipe the cache unnecessarily.
 * Cache is only cleared on a genuine user change or USER_UPDATED.
 */
export function useAuthStateChange() {
  const queryClient = useQueryClient();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        lastUserIdRef.current = null;
        return;
      }

      if (event === 'USER_UPDATED') {
        // Profile/email changed for current user — refresh user data only
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['user-context'] });
        return;
      }

      if (event === 'SIGNED_IN') {
        const incomingUserId = session?.user?.id ?? null;

        // Skip if it's the same user session re-emitted (tab focus, token refresh, etc.)
        if (incomingUserId === lastUserIdRef.current) return;

        // Genuine new login — invalidate all user/org data so fresh data is loaded on next mount
        queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['user-context'] });
        queryClient.invalidateQueries({ queryKey: ['organizations'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });

        lastUserIdRef.current = incomingUserId;
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);
}