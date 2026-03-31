import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productFormulaService } from '../services/api/productFormulaService';
import { toast } from '../lib/toast';
import { useOrganization } from '../context/OrganizationContext';
import type { AddFormulaItemData, ProductionMovementRequest } from '../types/productFormula';

export function useProductFormula(productId: string | undefined) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['product-formula', productId, currentOrganization?.organization_id],
    queryFn: () => productFormulaService.getFormula(productId!),
    enabled: !!productId && !!currentOrganization,
    staleTime: 30 * 1000,
  });
}

export function useProductionPreview(
  productId: string | undefined,
  quantity: number,
  warehouseId: string | undefined
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['production-preview', productId, quantity, warehouseId, currentOrganization?.organization_id],
    queryFn: () => productFormulaService.validateProduction(productId!, quantity, warehouseId!),
    enabled: !!productId && quantity > 0 && !!warehouseId && !!currentOrganization,
    staleTime: 0,
  });
}

export function useAddFormulaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddFormulaItemData) => productFormulaService.addFormulaItem(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', variables.finished_product_type_id] });
      toast.success('Componente agregado a la fórmula');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agregar componente');
      throw error;
    },
  });
}

export function useUpdateFormulaItem(finishedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formulaId, quantity_required }: { formulaId: string; quantity_required: number }) =>
      productFormulaService.updateFormulaItem(formulaId, quantity_required),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', finishedProductId] });
      toast.success('Cantidad actualizada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
      throw error;
    },
  });
}

export function useDeleteFormulaItem(finishedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formulaId: string) => productFormulaService.deleteFormulaItem(formulaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', finishedProductId] });
      toast.success('Componente eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
      throw error;
    },
  });
}

export function useCreateProductionMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductionMovementRequest) =>
      productFormulaService.createProductionMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['production-preview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Elaboración registrada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar elaboración');
      throw error;
    },
  });
}
