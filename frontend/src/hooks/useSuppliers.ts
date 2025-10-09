import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  supplierService, 
  type Supplier, 
  type CreateSupplierData, 
  type UpdateSupplierData,
  type SupplierSearchOptions,
  type SupplierStats
} from '@/services/api/supplierService';

/**
 * Hook options for supplier queries
 */
export interface UseSuppliersOptions {
  searchOptions?: SupplierSearchOptions;
  enabled?: boolean;
}

/**
 * Hook to get all suppliers for current organization
 */
export function useSuppliers(options: UseSuppliersOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['suppliers', currentOrganization?.organization_id, options.searchOptions],
    queryFn: async () => {
      try {
        const suppliers = await supplierService.getAll(options.searchOptions);
        return suppliers;
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        // Return empty array on error to prevent UI break
        return [];
      }
    },
    enabled: !!currentOrganization?.organization_id && (options.enabled !== false),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once
  });
}

/**
 * Hook to get a single supplier by ID
 */
export function useSupplier(supplierId: string, enabled = true) {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => supplierService.getById(supplierId),
    enabled: !!supplierId && enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to get supplier by CUIT
 */
export function useSupplierByCuit(cuit: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['supplier', 'cuit', cuit, currentOrganization?.organization_id],
    queryFn: () => supplierService.getByCuit(cuit),
    enabled: !!cuit && !!currentOrganization?.organization_id && enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to get preferred suppliers
 */
export function usePreferredSuppliers() {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['suppliers', 'preferred', currentOrganization?.organization_id],
    queryFn: () => supplierService.getPreferred(),
    enabled: !!currentOrganization?.organization_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get suppliers by business type
 */
export function useSuppliersByBusinessType(businessType: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['suppliers', 'businessType', businessType, currentOrganization?.organization_id],
    queryFn: () => supplierService.getByBusinessType(businessType),
    enabled: !!businessType && !!currentOrganization?.organization_id && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get available business types
 */
export function useBusinessTypes() {
  return useQuery({
    queryKey: ['suppliers', 'businessTypes'],
    queryFn: () => supplierService.getBusinessTypes(),
    staleTime: 1000 * 60 * 30, // 30 minutes - rarely changes
  });
}

/**
 * Hook to get supplier statistics
 */
export function useSupplierStats() {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ['suppliers', 'stats', currentOrganization?.organization_id],
    queryFn: () => supplierService.getStats(),
    enabled: !!currentOrganization?.organization_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  
  return useMutation({
    mutationFn: (data: CreateSupplierData) => supplierService.create(data),
    onSuccess: (newSupplier) => {
      // Invalidate and refetch supplier queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast.success(`Proveedor "${newSupplier.name}" creado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error creating supplier:', error);
      const message = error.response?.data?.error || 'Error al crear el proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierData }) =>
      supplierService.update(id, data),
    onSuccess: (updatedSupplier) => {
      // Update specific supplier in cache
      queryClient.setQueryData(['supplier', updatedSupplier.supplier_id], updatedSupplier);
      
      // Invalidate supplier list queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast.success(`Proveedor "${updatedSupplier.name}" actualizado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error updating supplier:', error);
      const message = error.response?.data?.error || 'Error al actualizar el proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (supplierId: string) => supplierService.delete(supplierId),
    onSuccess: () => {
      // Invalidate supplier queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting supplier:', error);
      const message = error.response?.data?.error || 'Error al eliminar el proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to deactivate a supplier
 */
export function useDeactivateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (supplierId: string) => supplierService.deactivate(supplierId),
    onSuccess: (deactivatedSupplier) => {
      // Update specific supplier in cache
      queryClient.setQueryData(['supplier', deactivatedSupplier.supplier_id], deactivatedSupplier);
      
      // Invalidate supplier list queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast.success(`Proveedor "${deactivatedSupplier.name}" desactivado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error deactivating supplier:', error);
      const message = error.response?.data?.error || 'Error al desactivar el proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to reactivate a supplier
 */
export function useReactivateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (supplierId: string) => supplierService.reactivate(supplierId),
    onSuccess: (reactivatedSupplier) => {
      // Update specific supplier in cache
      queryClient.setQueryData(['supplier', reactivatedSupplier.supplier_id], reactivatedSupplier);
      
      // Invalidate supplier list queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast.success(`Proveedor "${reactivatedSupplier.name}" reactivado exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error reactivating supplier:', error);
      const message = error.response?.data?.error || 'Error al reactivar el proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to set supplier preferred status
 */
export function useSetSupplierPreferred() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isPreferred }: { id: string; isPreferred: boolean }) =>
      supplierService.setPreferred(id, isPreferred),
    onSuccess: (updatedSupplier) => {
      // Update specific supplier in cache
      queryClient.setQueryData(['supplier', updatedSupplier.supplier_id], updatedSupplier);
      
      // Invalidate supplier list queries
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      const action = updatedSupplier.is_preferred ? 'marcado como preferido' : 'removido de preferidos';
      toast.success(`Proveedor "${updatedSupplier.name}" ${action} exitosamente`);
    },
    onError: (error: any) => {
      console.error('Error setting supplier preferred status:', error);
      const message = error.response?.data?.error || 'Error al cambiar el estado preferido del proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to search suppliers
 */
export function useSearchSuppliers() {
  return useMutation({
    mutationFn: ({ query, options }: { 
      query: string; 
      options?: Omit<SupplierSearchOptions, 'search'> 
    }) => supplierService.search(query, options),
    onError: (error: any) => {
      console.error('Error searching suppliers:', error);
      const message = error.response?.data?.error || 'Error al buscar proveedores';
      toast.error(message);
    }
  });
}

/**
 * Hook to validate supplier data
 */
export function useValidateSupplier() {
  return useMutation({
    mutationFn: (data: { cuit?: string; email?: string }) => 
      supplierService.validate(data),
    onError: (error: any) => {
      console.error('Error validating supplier:', error);
      const message = error.response?.data?.error || 'Error al validar los datos del proveedor';
      toast.error(message);
    }
  });
}

/**
 * Hook to check if CUIT is available
 */
export function useCheckCuitAvailability() {
  return useMutation({
    mutationFn: (cuit: string) => supplierService.isCuitAvailable(cuit),
    onError: (error: any) => {
      console.error('Error checking CUIT availability:', error);
    }
  });
}

/**
 * Hook to check if email is available
 */
export function useCheckEmailAvailability() {
  return useMutation({
    mutationFn: (email: string) => supplierService.isEmailAvailable(email),
    onError: (error: any) => {
      console.error('Error checking email availability:', error);
    }
  });
}

/**
 * Export types for use in components
 */
export type { 
  Supplier, 
  CreateSupplierData, 
  UpdateSupplierData, 
  SupplierSearchOptions,
  SupplierStats 
};