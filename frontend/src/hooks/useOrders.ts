import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { 
  orderService, 
  Order, 
  CreateOrderData, 
  UpdateOrderData, 
  OrderQueryParams, 
  OrderStats,
  OrderFilters 
} from '@/services/api/orderService';

// Query Keys
export const ORDER_QUERY_KEYS = {
  all: ['orders'] as const,
  lists: () => [...ORDER_QUERY_KEYS.all, 'list'] as const,
  list: (params?: OrderQueryParams) => [...ORDER_QUERY_KEYS.lists(), params] as const,
  details: () => [...ORDER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORDER_QUERY_KEYS.details(), id] as const,
  stats: () => [...ORDER_QUERY_KEYS.all, 'stats'] as const,
  search: (query: string, filters?: OrderFilters) => [...ORDER_QUERY_KEYS.all, 'search', query, filters] as const,
};

// Get orders with filters and pagination
export function useOrders(params?: OrderQueryParams) {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(params),
    queryFn: () => orderService.getOrders(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single order by ID
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orderId,
  });
}

// Get order statistics
export function useOrderStats() {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.stats(),
    queryFn: () => orderService.getOrderStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Search orders
export function useSearchOrders(query: string, filters?: OrderFilters) {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.search(query, filters),
    queryFn: () => orderService.searchOrders(query, filters),
    enabled: !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create order mutation
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderData) => orderService.createOrder(orderData),
    onSuccess: (newOrder) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      // Add the new order to cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(newOrder.order_id), newOrder);
      
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      console.error('Create order error:', error);
      toast.error(error?.message || 'Failed to create order');
    },
  });
}

// Update order mutation
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderData }: { orderId: string; orderData: UpdateOrderData }) =>
      orderService.updateOrder(orderId, orderData),
    onSuccess: (updatedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(updatedOrder.order_id), updatedOrder);
      
      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      toast.success('Order updated successfully');
    },
    onError: (error: any) => {
      console.error('Update order error:', error);
      toast.error(error?.message || 'Failed to update order');
    },
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) =>
      orderService.updateOrderStatus(orderId, status),
    onSuccess: (updatedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(updatedOrder.order_id), updatedOrder);
      
      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      console.error('Update order status error:', error);
      toast.error(error?.message || 'Failed to update order status');
    },
  });
}

// Delete order mutation
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.deleteOrder(orderId),
    onSuccess: (_, orderId) => {
      // Remove order from cache
      queryClient.removeQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });

      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });

      // Invalidate products cache in case stock was affected
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Order deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete order error:', error);
      toast.error(error?.message || 'Failed to delete order');
    },
  });
}

// Duplicate order mutation
export function useDuplicateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.duplicateOrder(orderId),
    onSuccess: (duplicatedOrder) => {
      // Add the duplicated order to cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(duplicatedOrder.order_id), duplicatedOrder);
      
      // Invalidate orders list to show the new order
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      toast.success('Order duplicated successfully');
    },
    onError: (error: any) => {
      console.error('Duplicate order error:', error);
      toast.error(error?.message || 'Failed to duplicate order');
    },
  });
}

// Process order mutation (mark as processing)
export function useProcessOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.processOrder(orderId),
    onSuccess: (processedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(processedOrder.order_id), processedOrder);
      
      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      toast.success('Order marked as processing. Stock availability validated.');
    },
    onError: (error: any) => {
      console.error('Process order error:', error);
      toast.error(error?.message || 'Failed to process order');
    },
  });
}

// Fulfill order mutation (mark as shipped and deduct stock)
export function useFulfillOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, fulfillmentData }: { orderId: string; fulfillmentData?: any }) =>
      orderService.fulfillOrder(orderId, fulfillmentData),
    onSuccess: (fulfilledOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(fulfilledOrder.order_id), fulfilledOrder);

      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });

      // Invalidate stock-related queries
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });

      // Invalidate products cache to update stock levels
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Order fulfilled successfully! Stock has been deducted.');
    },
    onError: (error: any) => {
      console.error('Fulfill order error:', error);
      toast.error(error?.message || 'Failed to fulfill order');
    },
  });
}

// Complete order mutation
export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.completeOrder(orderId),
    onSuccess: (completedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(ORDER_QUERY_KEYS.detail(completedOrder.order_id), completedOrder);
      
      // Invalidate orders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.stats() });
      
      toast.success('Order completed successfully');
    },
    onError: (error: any) => {
      console.error('Complete order error:', error);
      toast.error(error?.message || 'Failed to complete order');
    },
  });
}

// Prefetch order details
export function usePrefetchOrder() {
  const queryClient = useQueryClient();

  return (orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: ORDER_QUERY_KEYS.detail(orderId),
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