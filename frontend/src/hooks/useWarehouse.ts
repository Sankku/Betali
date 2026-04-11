import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { warehouseService } from "../services/api/warehouseService";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";
import { translateApiError } from "../utils/apiErrorTranslator";

export interface WarehouseFormData {
  name: string;
  location: string;
  is_active?: boolean;
}

export interface UseWarehousesOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useWarehouses(options: UseWarehousesOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["warehouses", currentOrganization?.organization_id],
    queryFn: async () => {
      try {
        const response = await warehouseService.getAll();
        // Normalize the response structure for consistent access
        if (Array.isArray(response)) {
          return { data: response, total: response.length };
        }
        if (response?.data && Array.isArray(response.data)) {
          return { data: response.data, total: response.data.length };
        }
        // Fallback for other response structures
        return { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        // Return empty array on error to prevent UI break
        return { data: [], total: 0 };
      }
    },
    enabled: options.enabled !== false && !!currentOrganization,
    refetchInterval: options.refetchInterval,
    staleTime: 1 * 60 * 1000, // 1 minute for fresher data
    retry: 1, // Only retry once
  });
}

export function useWarehouse(id: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["warehouse", id, currentOrganization?.organization_id],
    queryFn: async () => {
      return await warehouseService.getById(id);
    },
    enabled: enabled && !!id && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (data: WarehouseFormData) => warehouseService.create(data),
    onSuccess: (response) => {
      // Invalidate all warehouse queries for fresh data
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses", currentOrganization?.organization_id] });
      toast.success("Depósito creado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al crear el depósito. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WarehouseFormData> & { name?: string; location?: string } }) =>
      warehouseService.update(id, data as any),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse", variables.id] });
      toast.success("Depósito actualizado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al actualizar el depósito. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useDeactivateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Depósito desactivado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al desactivar el depósito. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseService.deletePermanently(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Depósito eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al eliminar el depósito. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useBulkDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => warehouseService.bulkDelete(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      
      if (result.blocked > 0) {
        toast.error(`No se pudieron eliminar ${result.blocked} depósitos porque tienen movimientos de stock asociados.`);
      }
      if (result.deleted > 0) {
        toast.success(`Se eliminaron exitosamente ${result.deleted} depósitos.`);
      }
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al borrar los depósitos. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useWarehouseMovements(
  warehouseId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["warehouse-movements", warehouseId, options, currentOrganization?.organization_id],
    queryFn: async () => {
      return await warehouseService.getMovements(warehouseId, options);
    },
    enabled: !!warehouseId && !!currentOrganization,
    staleTime: 2 * 60 * 1000, 
  });
}

export function useWarehouseManagement() {
  const queryClient = useQueryClient();
  
  const warehouses = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deactivateWarehouse = useDeactivateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const refetchWarehouses = () => {
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
  };

  return {
    warehouses: warehouses.data?.data || [],
    isLoading: warehouses.isLoading,
    error: warehouses.error,
    
    createWarehouse,
    updateWarehouse,
    deactivateWarehouse,
    deleteWarehouse,
    
    refetchWarehouses,
    isAnyMutationLoading: 
      createWarehouse.isPending ||
      updateWarehouse.isPending ||
      deactivateWarehouse.isPending ||
      deleteWarehouse.isPending,
  };
}