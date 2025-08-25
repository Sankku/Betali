import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, CreateUserData, UpdateUserData } from '../services/api/userService';
import { toast } from '../lib/toast';
import { Database } from '../types/database';
import { useOrganization } from '../context/OrganizationContext';

type User = Database["public"]["Tables"]["users"]["Row"];

export interface UseUsersOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useUserManagement(options: UseUsersOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['users', currentOrganization?.organization_id],
    queryFn: async () => {
      try {
        const users = await userService.getAll();
        return users;
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const user = await userService.getById(id);
      return user;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await userService.getCurrentProfile();
      return user;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (userData: CreateUserData) => {
      // Automatically include current organization ID
      const userDataWithOrg = {
        ...userData,
        organization_id: currentOrganization?.organization_id
      };
      return userService.create(userDataWithOrg);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al crear usuario: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      userService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      toast.success('Usuario actualizado exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar usuario: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UpdateUserData) => userService.updateCurrentProfile(userData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Perfil actualizado exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar perfil: ${error.message}`);
      throw error;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Contraseña cambiada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al cambiar contraseña: ${error.message}`);
      throw error;
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar usuario: ${error.message}`);
      throw error;
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      userService.toggleStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Estado del usuario actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar estado: ${error.message}`);
      throw error;
    },
  });
}

export function useSearchUsers() {
  return useMutation({
    mutationFn: (query: string) => userService.search(query),
    onError: (error: Error) => {
      toast.error(`Error en búsqueda: ${error.message}`);
      throw error;
    },
  });
}

/**
 * Hook to get current user context (permissions, role, organization)
 */
export function useUserContext() {
  return useQuery({
    queryKey: ['user-context'],
    queryFn: userService.getUserContext,
    staleTime: 2 * 60 * 1000, // Reduced to 2 minutes for faster updates
    retry: 1,
  });
}

/**
 * Hook to force refresh user context and auth state
 */
export function useRefreshUserContext() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // First, try to refresh the Supabase session
      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Could not refresh Supabase session:', error.message);
        }
      } catch (error) {
        console.warn('Error refreshing session:', error);
      }
      
      // Clear all relevant caches
      queryClient.removeQueries({ queryKey: ['user-context'] });
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      queryClient.removeQueries({ queryKey: ['users'] });
      
      // Force refetch user context
      const freshContext = await userService.getUserContext();
      return freshContext;
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch across the app
      queryClient.invalidateQueries({ queryKey: ['user-context'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      toast.success('User context refreshed');
    },
    onError: (error: Error) => {
      console.error('Error refreshing user context:', error);
      toast.error(`Error refreshing context: ${error.message}`);
    },
  });
}

// Export types for use in components
export type { User, CreateUserData, UpdateUserData };