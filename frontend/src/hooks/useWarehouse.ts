import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { warehouseService } from "../services/api/warehouseService";
import { toast } from "../lib/toast"; 

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
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const response = await warehouseService.getAll();
      return response?.data || response;
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useWarehouse(id: string, enabled = true) {
  return useQuery({
    queryKey: ["warehouse", id],
    queryFn: async () => {
      const response = await warehouseService.getById(id);
      return response?.data || response;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WarehouseFormData) => warehouseService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Almacén creado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al crear almacén: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WarehouseFormData }) =>
      warehouseService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse", variables.id] });
      toast.success("Almacén actualizado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar almacén: ${error.message}`);
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
      toast.success("Almacén desactivado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al desactivar almacén: ${error.message}`);
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
      toast.success("Almacén eliminado permanentemente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar almacén: ${error.message}`);
      throw error;
    },
  });
}

export function useWarehouseMovements(
  warehouseId: string,
  options: { limit?: number; offset?: number } = {}
) {
  return useQuery({
    queryKey: ["warehouse-movements", warehouseId, options],
    queryFn: async () => {
      const response = await warehouseService.getMovements(warehouseId, options);
      return response?.data || response;
    },
    enabled: !!warehouseId,
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
    warehouses: warehouses.data,
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