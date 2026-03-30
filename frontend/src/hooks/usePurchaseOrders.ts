import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { translateApiError } from '@/utils/apiErrorTranslator';
import { useOrganization } from '@/context/OrganizationContext';
import { purchaseOrdersService } from '@/services/api/purchaseOrdersService';
import {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrderFilters,
  PurchaseOrderStatus,
  ReceivePurchaseOrderPayload,
} from '@/types/purchaseOrders';

/**
 * Hook options for purchase order queries
 */
export interface UsePurchaseOrdersOptions {
  filters?: PurchaseOrderFilters;
  enabled?: boolean;
}

/**
 * Hook to get all purchase orders for current organization
 */
export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['purchaseOrders', currentOrganization?.organization_id, options.filters],
    queryFn: async () => {
      try {
        const purchaseOrders = await purchaseOrdersService.getAll(options.filters);
        return purchaseOrders;
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return [];
      }
    },
    enabled: !!currentOrganization?.organization_id && (options.enabled !== false),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

/**
 * Hook to get a single purchase order by ID
 */
export function usePurchaseOrder(purchaseOrderId: string, enabled = true) {
  return useQuery({
    queryKey: ['purchaseOrder', purchaseOrderId],
    queryFn: () => purchaseOrdersService.getById(purchaseOrderId),
    enabled: !!purchaseOrderId && enabled,
    staleTime: 0, // Always refetch on mount so re-opening the modal gets fresh data
  });
}

/**
 * Hook to get purchase orders by status
 */
export function usePurchaseOrdersByStatus(status: PurchaseOrderStatus, enabled = true) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['purchaseOrders', 'status', status, currentOrganization?.organization_id],
    queryFn: () => purchaseOrdersService.getByStatus(status),
    enabled: !!currentOrganization?.organization_id && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get purchase orders by supplier
 */
export function usePurchaseOrdersBySupplier(supplierId: string, enabled = true) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['purchaseOrders', 'supplier', supplierId, currentOrganization?.organization_id],
    queryFn: () => purchaseOrdersService.getBySupplier(supplierId),
    enabled: !!supplierId && !!currentOrganization?.organization_id && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderRequest) => purchaseOrdersService.create(data),
    onSuccess: (newPurchaseOrder) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      toast.success(
        `Orden de compra "${newPurchaseOrder.purchase_order_number}" creada exitosamente`
      );
    },
    onError: (error: any) => {
      console.error('Error creating purchase order:', error);
      toast.error(translateApiError(error, 'Error al crear la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to update a purchase order
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderRequest }) =>
      purchaseOrdersService.update(id, data),
    onSuccess: (updatedPurchaseOrder) => {
      // Remove stale partial cache (update response has no joins)
      queryClient.removeQueries({ queryKey: ['purchaseOrder', updatedPurchaseOrder.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      toast.success(
        `Orden de compra "${updatedPurchaseOrder.purchase_order_number}" actualizada exitosamente`
      );
    },
    onError: (error: any) => {
      console.error('Error updating purchase order:', error);
      toast.error(translateApiError(error, 'Error al actualizar la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to update purchase order status
 */
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderStatusRequest }) =>
      purchaseOrdersService.updateStatus(id, data),
    onSuccess: (updatedPurchaseOrder) => {
      // Remove (not setQueryData/invalidate) — the status endpoint returns no joins.
      // Removing the cache entry forces isLoading=true on next open, so view/receive
      // modals never flash partial (joinless) data.
      queryClient.removeQueries({ queryKey: ['purchaseOrder', updatedPurchaseOrder.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      const statusMessage =
        updatedPurchaseOrder.status === 'received'
          ? 'recibida y stock actualizado'
          : `cambiada a ${updatedPurchaseOrder.status}`;

      toast.success(
        `Orden de compra "${updatedPurchaseOrder.purchase_order_number}" ${statusMessage}`
      );
    },
    onError: (error: any) => {
      console.error('Error updating purchase order status:', error);
      toast.error(translateApiError(error, 'Error al actualizar el estado de la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to cancel a purchase order
 */
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseOrderId: string) => purchaseOrdersService.cancel(purchaseOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      toast.success('Orden de compra cancelada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error cancelling purchase order:', error);
      toast.error(translateApiError(error, 'Error al cancelar la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to receive a purchase order with lot assignment per line.
 * Replaces the old simple status-change approach.
 */
export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lines }: ReceivePurchaseOrderPayload) =>
      purchaseOrdersService.receive(id, lines),
    onSuccess: (receivedPO) => {
      // NOTE: the purchase orders query key in this codebase is camelCase 'purchaseOrders'
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', receivedPO.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      // Reception creates stock movements — refresh product stock views
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      queryClient.invalidateQueries({ queryKey: ['available-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });

      const msg = receivedPO.status === 'received'
        ? `OC "${receivedPO.purchase_order_number}" recibida completamente. Stock actualizado.`
        : `OC "${receivedPO.purchase_order_number}" parcialmente recibida. Stock actualizado.`;
      toast.success(msg);
    },
    onError: (error: any) => {
      console.error('Error receiving purchase order:', error);
      toast.error(translateApiError(error, 'Error al recibir la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to approve purchase order
 */
export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseOrderId: string) => purchaseOrdersService.approve(purchaseOrderId),
    onSuccess: (approvedPurchaseOrder) => {
      queryClient.removeQueries({ queryKey: ['purchaseOrder', approvedPurchaseOrder.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      toast.success(
        `Orden de compra "${approvedPurchaseOrder.purchase_order_number}" aprobada exitosamente`
      );
    },
    onError: (error: any) => {
      console.error('Error approving purchase order:', error);
      toast.error(translateApiError(error, 'Error al aprobar la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Hook to submit purchase order for approval
 */
export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseOrderId: string) => purchaseOrdersService.submit(purchaseOrderId),
    onSuccess: (submittedPurchaseOrder) => {
      queryClient.removeQueries({ queryKey: ['purchaseOrder', submittedPurchaseOrder.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });

      toast.success(
        `Orden de compra "${submittedPurchaseOrder.purchase_order_number}" enviada para aprobación`
      );
    },
    onError: (error: any) => {
      console.error('Error submitting purchase order:', error);
      toast.error(translateApiError(error, 'Error al enviar la orden de compra. Intenta de nuevo.'));
    },
  });
}

/**
 * Purchase Order Status Options for UI
 */
export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente de Aprobación' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'partially_received', label: 'Parcialmente Recibida' },
  { value: 'received', label: 'Recibida' },
  { value: 'cancelled', label: 'Cancelada' },
] as const;

/**
 * Export types for use in components
 */
export type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseOrderFilters,
  PurchaseOrderStatus,
};
