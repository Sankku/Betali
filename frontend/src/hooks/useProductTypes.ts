import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productTypesService } from "../services/api/productTypesService";
import type { ProductTypeFormData, BulkImportRow } from "../services/api/productTypesService";
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

export function useProductType(id: string) {
  return useQuery({
    queryKey: ["product-type", id],
    queryFn: () => productTypesService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductTypeFormData) => productTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      toast.success("Tipo de producto creado exitosamente");
    },
    onError: (error: Error) => {
      const isDuplicate = (error as ApiError).status === 409 || error.message?.includes('already exists');
      toast.error(
        isDuplicate
          ? "Ya existe un tipo de producto con ese SKU en tu organización."
          : "Error al crear el tipo de producto. Intenta de nuevo."
      );
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
      queryClient.invalidateQueries({ queryKey: ["product-type", variables.id] });
      toast.success("Tipo de producto actualizado exitosamente");
    },
    onError: (error: Error) => {
      const isDuplicate = (error as ApiError).status === 409 || error.message?.includes('already exists');
      toast.error(
        isDuplicate
          ? "Ya existe otro tipo de producto con ese SKU en tu organización."
          : "Error al actualizar el tipo de producto. Intenta de nuevo."
      );
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
      toast.success("Tipo de producto eliminado exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar el tipo de producto. Intenta de nuevo.");
    },
  });
}

export function useProductTypeImport() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (rows: BulkImportRow[]) => productTypesService.bulkImport(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-types", currentOrganization?.organization_id],
      });
    },
    onError: (error: Error) => {
      console.error("Bulk import error:", error);
    },
  });
}
