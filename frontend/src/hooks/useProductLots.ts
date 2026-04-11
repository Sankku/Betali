import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productLotsService } from "../services/api/productLotsService";
import type { ProductLotFormData } from "../services/api/productLotsService";
import { toast } from "../lib/toast";

interface ApiError extends Error {
  status?: number;
}

export function useAllProductLots() {
  return useQuery({
    queryKey: ["product-lots", "all"],
    queryFn: () => productLotsService.getAll(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useProductLots(typeId: string | undefined) {
  return useQuery({
    queryKey: ["product-lots", typeId],
    queryFn: () => productLotsService.getByType(typeId!),
    enabled: !!typeId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useCreateProductLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ typeId, data }: { typeId: string; data: ProductLotFormData }) =>
      productLotsService.create(typeId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-lots", variables.typeId] });
      queryClient.invalidateQueries({ queryKey: ["product-lots", "all"] });
      toast.success("Lote creado exitosamente");
    },
    onError: (error: Error) => {
      const isDuplicate = (error as ApiError).status === 409 || error.message?.includes('already exists');
      toast.error(
        isDuplicate
          ? "Ya existe un lote con ese número en esta organización."
          : "Error al crear el lote. Intenta de nuevo."
      );
      throw error;
    },
  });
}

export function useUpdateProductLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductLotFormData> }) =>
      productLotsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-lots"] });
      toast.success("Lote actualizado exitosamente");
    },
    onError: () => {
      toast.error("Error al actualizar el lote. Intenta de nuevo.");
      throw new Error("Update lot failed");
    },
  });
}

export function useDeleteProductLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productLotsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-lots"] });
      toast.success("Lote eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el lote. Intenta de nuevo.");
    },
  });
}

export function useBulkDeleteProductLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => productLotsService.bulkDelete(ids),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["product-lots"] });
      
      toast.success(`Se eliminaron exitosamente ${response.deleted} lotes.`);
      
      if (response.blocked > 0) {
        toast.error(`No se pudieron eliminar ${response.blocked} lotes porque tienen movimientos de stock asociados.`);
      }
    },
    onError: () => {
      toast.error("Error al eliminar los lotes. Intenta de nuevo.");
    },
  });
}
