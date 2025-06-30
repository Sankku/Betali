import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockMovementService, StockMovementFormData } from "../services/api/stockMovementService";
import { toast } from "../lib/toast";

export interface UseStockMovementsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useStockMovements(options: UseStockMovementsOptions = {}) {
  return useQuery({
    queryKey: ["stockMovements"],
    queryFn: async () => {
      try {
        const response = await stockMovementService.getAll();
        return response?.data || response;
      } catch (error) {
        console.error('Error fetching stock movements:', error);
        // Return empty array on error to prevent UI break
        return [];
      }
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
  });
}

export function useStockMovement(id: string, enabled = true) {
  return useQuery({
    queryKey: ["stockMovement", id],
    queryFn: async () => {
      const response = await stockMovementService.getById(id);
      return response?.data || response;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (movementData: StockMovementFormData) =>
      stockMovementService.create(movementData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      toast.success(response.message || "Movimiento creado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al crear movimiento: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StockMovementFormData> }) =>
      stockMovementService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovement", variables.id] });
      toast.success(response.message || "Movimiento actualizado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar movimiento: ${error.message}`);
      throw error;
    },
  });
}

export function useDeleteStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => stockMovementService.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      toast.success(response.message || "Movimiento eliminado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar movimiento: ${error.message}`);
      throw error;
    },
  });
}

export function useStockMovementsByProduct(productId: string, enabled = true) {
  return useQuery({
    queryKey: ["stockMovements", "product", productId],
    queryFn: () => stockMovementService.getByProduct(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovementsByWarehouse(warehouseId: string, enabled = true) {
  return useQuery({
    queryKey: ["stockMovements", "warehouse", warehouseId],
    queryFn: () => stockMovementService.getByWarehouse(warehouseId),
    enabled: enabled && !!warehouseId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovementsByDateRange(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ["stockMovements", "dateRange", startDate, endDate],
    queryFn: () => stockMovementService.getByDateRange(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}