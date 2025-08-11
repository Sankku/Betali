import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/api/organizationService';
import { Organization } from '../types/organization';
import { toast } from 'sonner';

/**
 * Hook for fetching organizations
 */
export const useOrganizationManagement = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for creating organizations
 */
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create organization');
    },
  });
};

/**
 * Hook for updating organizations
 */
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Organization> }) =>
      organizationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });
};

/**
 * Hook for deleting organizations
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });
};