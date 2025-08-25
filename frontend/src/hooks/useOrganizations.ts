import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/api/organizationService';
import { Organization } from '../types/organization';
import { toast } from '../lib/toast';

export interface UseOrganizationsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useOrganizationManagement(options: UseOrganizationsOptions = {}) {
  return useQuery({
    queryKey: ['user-organizations'],
    queryFn: async () => {
      try {
        const organizations = await organizationService.getUserOrganizations();
        return organizations;
      } catch (error) {
        console.error('Error fetching user organizations:', error);
        return [];
      }
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useOrganization(id: string, enabled = true) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      const organization = await organizationService.getById(id);
      return organization;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationData: Partial<Organization>) => 
      organizationService.create(organizationData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      toast.success('Organización creada exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al crear organización: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Organization> }) =>
      organizationService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', variables.id] });
      toast.success('Organización actualizada exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar organización: ${error.message}`);
      throw error;
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      toast.success('Organización eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar organización: ${error.message}`);
      throw error;
    },
  });
}

/**
 * Hook for admin users to get ALL organizations (requires admin permissions)
 * Use this ONLY for admin interfaces
 */
export function useAllOrganizations(options: UseOrganizationsOptions = {}) {
  return useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      try {
        const organizations = await organizationService.getAll();
        return organizations;
      } catch (error) {
        console.error('Error fetching all organizations (admin):', error);
        return [];
      }
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Export types for use in components
export type { Organization };