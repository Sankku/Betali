// src/hooks/useProducts.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsService } from "../services/api/productsService";
import { toast } from "../lib/toast"; 


export interface ProductFormData {
  name: string;
  batch_number: string;
  origin_country: string;
  expiration_date: string;
  description?: string;
  senasa_product_id?: string;
}

export interface UseProductsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await productsService.getAll();
      return response?.data || response;
    },
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await productsService.getById(id);
      return response?.data || response;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductFormData) => productsService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto creado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al crear producto: ${error.message}`);
      throw error;
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      productsService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
      toast.success("Producto actualizado exitosamente");
      return response;
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar producto: ${error.message}`);
      throw error;
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar producto: ${error.message}`);
      throw error;
    },
  });
}

export function useProductManagement() {
  const queryClient = useQueryClient();
  
  const products = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const refetchProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return {
    products: products.data,
    isLoading: products.isLoading,
    error: products.error,
    
    createProduct,
    updateProduct,
    deleteProduct,
    
    refetchProducts,
    isAnyMutationLoading: 
      createProduct.isPending ||
      updateProduct.isPending ||
      deleteProduct.isPending,
  };
}