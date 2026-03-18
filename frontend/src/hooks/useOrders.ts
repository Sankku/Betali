import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { translateApiError } from '@/utils/apiErrorTranslator';
import {
  orderService,
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderQueryParams,
  OrderStats,
  OrderFilters
} from '@/services/api/orderService';
import { useOrganization } from '@/context/OrganizationContext';

// Query Keys
export const ORDER_QUERY_KEYS = {
  all: (orgId: string | undefined) => ['orders', orgId] as const,
  lists: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, params?: OrderQueryParams) => [...ORDER_QUERY_KEYS.lists(orgId), params] as const,
  details: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...ORDER_QUERY_KEYS.details(orgId), id] as const,
  stats: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'stats'] as const,
  search: (orgId: string | undefined, query: string, filters?: OrderFilters) => [...ORDER_QUERY_KEYS.all(orgId), 'search', query, filters] as const,
};

// Get orders with filters and pagination
export function useOrders(params?: OrderQueryParams) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(orgId, params),
    queryFn: () => orderService.getOrders(params),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single order by ID
export function useOrder(orderId: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(orgId, orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orgId && !!orderId,
  });
}

// Get order statistics
export function useOrderStats() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.stats(orgId),
    queryFn: () => orderService.getOrderStats(),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Search orders
export function useSearchOrders(query: string, filters?: OrderFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.search(orgId, query, filters),
    queryFn: () => orderService.searchOrders(query, filters),
    enabled: !!orgId && !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create order mutation
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: (orderData: CreateOrderData) => orderService.createOrder(orderData),
    onSuccess: (response) => {
      const order = (response as any)?.data ?? response;

      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, order.order_id), response);

      toast.success('Pedido creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Create order error:', error);
      toast.error(translateApiError(error, 'Error al crear el pedido. Intenta de nuevo.'));
    },
  });
}

// Update order mutation
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: ({ orderId, orderData }: { orderId: string; orderData: UpdateOrderData }) =>
      orderService.updateOrder(orderId, orderData),
    onSuccess: (response) => {
      // Backend returns { success, data: order } — unwrap to get the actual order
      const order = (response as any)?.data ?? response;

      // Update detail cache at the correct key
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, order.order_id), response);

      // Refetch list immediately so the grid reflects the new totals
      queryClient.refetchQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      toast.success('Pedido actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Update order error:', error);
      toast.error(translateApiError(error, 'Error al actualizar el pedido. Intenta de nuevo.'));
    },
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) =>
      orderService.updateOrderStatus(orderId, status),
    onSuccess: (response) => {
      const order = (response as any)?.data ?? response;

      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, order.order_id), response);
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      if (order.status === 'shipped') {
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }

      toast.success('Estado del pedido actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Update order status error:', error);
      toast.error(translateApiError(error, 'Error al actualizar el estado del pedido. Intenta de nuevo.'));
    },
  });
}

// Delete order mutation
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: (orderId: string) => orderService.deleteOrder(orderId),
    onSuccess: (_, orderId) => {
      // Remove order from cache
      queryClient.removeQueries({ queryKey: ORDER_QUERY_KEYS.detail(orgId, orderId) });

      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      // Invalidate products cache in case stock was affected
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Pedido eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Delete order error:', error);
      toast.error(translateApiError(error, 'Error al eliminar el pedido. Intenta de nuevo.'));
    },
  });
}

// Duplicate order mutation
export function useDuplicateOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: (orderId: string) => orderService.duplicateOrder(orderId),
    onSuccess: (duplicatedOrder) => {
      // Add the duplicated order to cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, duplicatedOrder.order_id), duplicatedOrder);

      // Invalidate orders list to show the new order
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      toast.success('Pedido duplicado exitosamente');
    },
    onError: (error: any) => {
      console.error('Duplicate order error:', error);
      toast.error(translateApiError(error, 'Error al duplicar el pedido. Intenta de nuevo.'));
    },
  });
}

// Process order mutation (mark as processing)
export function useProcessOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: (orderId: string) => orderService.processOrder(orderId),
    onSuccess: (processedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, processedOrder.order_id), processedOrder);

      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      toast.success('Pedido marcado como en proceso. Disponibilidad de stock validada.');
    },
    onError: (error: any) => {
      console.error('Process order error:', error);
      toast.error(translateApiError(error, 'Error al procesar el pedido. Intenta de nuevo.'));
    },
  });
}

// Fulfill order mutation (mark as shipped and deduct stock)
export function useFulfillOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: ({ orderId, fulfillmentData }: { orderId: string; fulfillmentData?: any }) =>
      orderService.fulfillOrder(orderId, fulfillmentData),
    onSuccess: (fulfilledOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, fulfilledOrder.order_id), fulfilledOrder);

      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      // Invalidate stock-related queries
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });

      // Invalidate products cache to update stock levels
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Pedido despachado exitosamente. Stock descontado.');
    },
    onError: (error: any) => {
      console.error('Fulfill order error:', error);
      toast.error(translateApiError(error, 'Error al despachar el pedido. Intenta de nuevo.'));
    },
  });
}

// Complete order mutation
export function useCompleteOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: (orderId: string) => orderService.completeOrder(orderId),
    onSuccess: (completedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(orgId, completedOrder.order_id), completedOrder);

      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats(orgId) });

      toast.success('Pedido completado exitosamente');
    },
    onError: (error: any) => {
      console.error('Complete order error:', error);
      toast.error(translateApiError(error, 'Error al completar el pedido. Intenta de nuevo.'));
    },
  });
}

// Prefetch order details
export function usePrefetchOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return (orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: ORDER_QUERY_KEYS.detail(orgId, orderId),
      queryFn: () => orderService.getOrderById(orderId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
}

// Order status options for forms - comprehensive workflow states
export const ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'shipped', label: 'Shipped', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

// Helper to get status option by value
export function getOrderStatusOption(status: Order['status']) {
  return ORDER_STATUS_OPTIONS.find(option => option.value === status);
}

// Helper to get status color for badges
export function getOrderStatusColor(status: Order['status']) {
  return getOrderStatusOption(status)?.color || 'gray';
}

// Valid status transitions based on business rules
const VALID_STATUS_TRANSITIONS: Record<Order['status'], Order['status'][]> = {
  'draft': ['pending', 'cancelled'],
  'pending': ['processing', 'cancelled'],
  'processing': ['shipped', 'cancelled'],
  'shipped': ['completed'],
  'completed': [],
  'cancelled': ['draft'],
};

// Helper to get valid next statuses for a given current status
export function getValidStatusTransitions(currentStatus: Order['status']) {
  const validNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return ORDER_STATUS_OPTIONS.filter(option =>
    validNextStatuses.includes(option.value as Order['status'])
  );
}
