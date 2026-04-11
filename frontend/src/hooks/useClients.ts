import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  clientService, 
  CreateClientData, 
  UpdateClientData, 
  ClientSearchOptions,
  ClientStats,
  ClientValidation 
} from '../services/api/clientService';
import { toast } from '../lib/toast';
import { translateApiError } from '../utils/apiErrorTranslator';
import { Database } from '../types/database';
import { useOrganization } from '../context/OrganizationContext';

type Client = Database["public"]["Tables"]["clients"]["Row"];

export interface UseClientsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  searchOptions?: ClientSearchOptions;
}

export function useClients(options: UseClientsOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['clients', currentOrganization?.organization_id, options.searchOptions],
    queryFn: async () => {
      try {
        const clients = await clientService.getAll(options.searchOptions);
        // Normalize the response structure for consistent access
        if (Array.isArray(clients)) {
          return { data: clients, total: clients.length };
        }
        if (clients?.data && Array.isArray(clients.data)) {
          return { data: clients.data, total: clients.data.length };
        }
        // Fallback for other response structures
        return { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching clients:', error);
        return { data: [], total: 0 };
      }
    },
    enabled: options.enabled !== false && !!currentOrganization,
    refetchInterval: options.refetchInterval,
    staleTime: 1 * 60 * 1000, // 1 minute for fresher data
    retry: 1,
  });
}

export function useClient(id: string, enabled = true) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const client = await clientService.getById(id);
      return client;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientByCuit(cuit: string, enabled = true) {
  return useQuery({
    queryKey: ['client', 'cuit', cuit],
    queryFn: async () => {
      const client = await clientService.getByCuit(cuit);
      return client;
    },
    enabled: enabled && !!cuit && clientService.isValidCuitFormat(cuit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientsByBranch(branchId: string, options: ClientSearchOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['clients', 'branch', branchId, currentOrganization?.organization_id, options],
    queryFn: async () => {
      const clients = await clientService.getByBranch(branchId, options);
      return clients;
    },
    enabled: !!branchId && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientStats() {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['clients', 'stats', currentOrganization?.organization_id],
    queryFn: async () => {
      const stats = await clientService.getStats();
      return stats;
    },
    enabled: !!currentOrganization,
    staleTime: 2 * 60 * 1000, // 2 minutes for fresher stats
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (clientData: CreateClientData) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      // The backend will automatically add organization_id, but we can validate here
      return clientService.create(clientData);
    },
    onSuccess: (response) => {
      const orgId = currentOrganization?.organization_id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'stats', orgId] });
      toast.success('Cliente creado exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al crear el cliente. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientData }) =>
      clientService.update(id, data),
    onSuccess: (response, variables) => {
      const orgId = currentOrganization?.organization_id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'stats', orgId] });
      toast.success('Cliente actualizado exitosamente');
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al actualizar el cliente. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      const orgId = currentOrganization?.organization_id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'stats', orgId] });
      toast.success('Cliente eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al eliminar el cliente. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useBulkDeleteClient() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (ids: string[]) => clientService.bulkDelete(ids),
    onSuccess: (response) => {
      const orgId = currentOrganization?.organization_id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'stats', orgId] });
      toast.success(`Se eliminaron exitosamente ${response?.deleted || "los"} clientes`);
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al eliminar clientes. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useSearchClients() {
  return useMutation({
    mutationFn: ({ query, options }: { query: string; options?: Omit<ClientSearchOptions, 'search'> }) => 
      clientService.search(query, options),
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al buscar clientes. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useValidateClient() {
  return useMutation({
    mutationFn: (data: { cuit?: string; email?: string }) => clientService.validate(data),
    onError: (error: Error) => {
      console.error('Error validating client:', error);
      throw error;
    },
  });
}

// Helper hook for CUIT validation
export function useValidateCuit() {
  const validateClient = useValidateClient();
  
  return useMutation({
    mutationFn: (cuit: string) => {
      if (!clientService.isValidCuitFormat(cuit)) {
        throw new Error('Formato de CUIT inválido. Debe tener 11 dígitos.');
      }
      return validateClient.mutateAsync({ cuit });
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al validar el CUIT. Intenta de nuevo.'));
      throw error;
    },
  });
}

// Helper hook for email validation
export function useValidateEmail() {
  const validateClient = useValidateClient();
  
  return useMutation({
    mutationFn: (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Formato de email inválido.');
      }
      return validateClient.mutateAsync({ email });
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al validar el email. Intenta de nuevo.'));
      throw error;
    },
  });
}

// Export types for use in components
export type { Client, CreateClientData, UpdateClientData, ClientStats, ClientValidation, ClientSearchOptions };