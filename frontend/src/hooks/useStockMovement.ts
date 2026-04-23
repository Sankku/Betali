import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { stockMovementService, StockMovementFormData } from "../services/api/stockMovementService";
import { toast } from "../lib/toast";
import { translateApiError } from "../utils/apiErrorTranslator";
import { useOrganization } from "../context/OrganizationContext";

export interface UseStockMovementsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useStockMovements(options: UseStockMovementsOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["stockMovements", currentOrganization?.organization_id],
    queryFn: async () => {
      try {
        // stockMovementService.getAll() already unwraps response.data internally
        return await stockMovementService.getAll();
      } catch (error) {
        console.error('Error fetching stock movements:', error);
        return [];
      }
    },
    enabled: options.enabled !== false && !!currentOrganization,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
  });
}

export function useStockMovementsInfinite(limit = 25) {
  const { currentOrganization } = useOrganization();
  
  return useInfiniteQuery({
    queryKey: ["stockMovements", "infinite", currentOrganization?.organization_id],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const data = await stockMovementService.getAll({ 
          limit, 
          offset: pageParam as number 
        });
        return data;
      } catch (error) {
        console.error('Error fetching stock movements:', error);
        return [];
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < limit) {
        return undefined;
      }
      return allPages.length * limit;
    },
    initialPageParam: 0,
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovement(id: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["stockMovement", id, currentOrganization?.organization_id],
    queryFn: async () => {
      // stockMovementService.getById() already unwraps response.data internally
      return await stockMovementService.getById(id);
    },
    enabled: enabled && !!id && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (movementData: StockMovementFormData) =>
      stockMovementService.create(movementData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-lots"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["available-stock"], refetchType: 'all' });
      toast.success(response.message || "Movimiento creado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al crear el movimiento. Intenta de nuevo.'));
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
      queryClient.invalidateQueries({ queryKey: ["stockMovements"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["stockMovement", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["product-lots"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["available-stock"], refetchType: 'all' });
      toast.success(response.message || "Movimiento actualizado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al actualizar el movimiento. Intenta de nuevo.'));
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
      // Invalidate products cache to update stock levels
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(response.message || "Movimiento eliminado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al eliminar el movimiento. Intenta de nuevo.'));
      throw error;
    },
  });
}

export function useBulkDeleteStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => stockMovementService.bulkDelete(ids),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      // Invalidate products cache to update stock levels
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      
      toast.success(`Se eliminaron exitosamente ${response.deleted} movimientos de stock.`);
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, 'Error al eliminar los movimientos. Intenta de nuevo.'));
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