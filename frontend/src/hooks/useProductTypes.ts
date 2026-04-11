import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { productTypesService } from "../services/api/productTypesService";
import type { ProductTypeFormData, BulkImportRow, ProductTypesParams } from "../services/api/productTypesService";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";

interface ApiError extends Error {
  status?: number;
}

export function useProductTypes() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["product-types", currentOrganization?.organization_id],
    queryFn: async () => {
      const data = await productTypesService.getAll();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useProductTypesPaginated(params: ProductTypesParams) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["product-types-paginated", currentOrganization?.organization_id, params],
    queryFn: () => productTypesService.getPaginated(params),
    enabled: !!currentOrganization,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev, // keep previous page visible while loading next
    retry: 1,
  });
}

export function useProductType(id: string) {
  return useQuery({
    queryKey: ["product-type", id],
    queryFn: () => productTypesService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductTypesInfinite(params: Omit<ProductTypesParams, "page">) {
  const { currentOrganization } = useOrganization();

  return useInfiniteQuery({
    queryKey: ["product-types-infinite", currentOrganization?.organization_id, params],
    queryFn: ({ pageParam = 1 }) => productTypesService.getPaginated({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.pages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!currentOrganization,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductTypeFormData) => productTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"] });
      toast.success("Tipo de producto creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el tipo de producto. Intenta de nuevo.");
      throw error;
    },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductTypeFormData> }) =>
      productTypesService.update(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["product-type", variables.id] });
      toast.success("Tipo de producto actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar el tipo de producto. Intenta de nuevo.");
      throw error;
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productTypesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"] });
      toast.success("Tipo de producto eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el tipo de producto. Intenta de nuevo.");
    },
  });
}

export function useProductTypeImport() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (rows: BulkImportRow[]) => productTypesService.bulkImport(rows),
    onSuccess: () => {
      const orgId = currentOrganization?.organization_id;
      queryClient.invalidateQueries({ queryKey: ["product-types", orgId] });
      queryClient.invalidateQueries({ queryKey: ["product-types-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["product-lots", "all"] });
    },
    onError: (error: Error) => {
      console.error("Bulk import error:", error);
    },
  });
}
