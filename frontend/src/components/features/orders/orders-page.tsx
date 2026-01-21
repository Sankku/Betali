import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ShoppingCart,
  Search,
  Trash,
  Copy,
  Filter,
  TrendingUp,
  Play,
  Truck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { OrderModal } from './order-modal';
import { OrderStatusBadge } from './order-status-badge';
import {
  useOrders,
  useOrderStats,
  useUpdateOrderStatus,
  useDeleteOrder,
  useDuplicateOrder,
  useProcessOrder,
  useFulfillOrder,
  useCompleteOrder,
  ORDER_STATUS_OPTIONS,
  getValidStatusTransitions,
} from '@/hooks/useOrders';
import { useClients } from '@/hooks/useClients';
import { Order, OrderQueryParams } from '@/services/api/orderService';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  order?: Order;
}

export function OrdersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [batchActionModalState, setBatchActionModalState] = useState({
    isOpen: false,
    action: '' as 'process' | 'fulfill' | 'complete' | 'delete' | '',
    orders: [] as Order[],
  });

  // Build query parameters
  const queryParams = useMemo<OrderQueryParams>(() => {
    const params: OrderQueryParams = {
      page: currentPage,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'desc',
    };

    return params;
  }, [currentPage]);

  // Hooks
  const { data: ordersData, isLoading } = useOrders(queryParams);
  const { data: orderStatsResponse } = useOrderStats();
  const orderStats = orderStatsResponse?.data;
  const { data: clientsResponse } = useClients();
  const clients = clientsResponse?.data || [];
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const duplicateOrderMutation = useDuplicateOrder();
  const processOrderMutation = useProcessOrder();
  const fulfillOrderMutation = useFulfillOrder();
  const completeOrderMutation = useCompleteOrder();

  // Handlers
  const handleCreateOrder = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create' });
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setModalState({ isOpen: true, mode: 'view', order });
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setModalState({ isOpen: true, mode: 'edit', order });
  }, []);

  const handleStatusChange = useCallback(
    async (order: Order, newStatus: Order['status']) => {
      try {
        await updateOrderStatusMutation.mutateAsync({
          orderId: order.order_id,
          status: newStatus,
        });
      } catch (error) {
        // Error handled by mutation hook
      }
    },
    [updateOrderStatusMutation]
  );

  // Batch action handlers - now much simpler with TableWithBulkActions

  const confirmBatchAction = useCallback(async () => {
    const { action, orders } = batchActionModalState;
    if (!action || orders.length === 0) return;

    try {
      const promises = orders.map(order => {
        switch (action) {
          case 'process':
            return processOrderMutation.mutateAsync(order.order_id);
          case 'fulfill':
            return fulfillOrderMutation.mutateAsync({
              orderId: order.order_id,
              fulfillmentData: {},
            });
          case 'complete':
            return completeOrderMutation.mutateAsync(order.order_id);
          case 'delete':
            return deleteOrderMutation.mutateAsync(order.order_id);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      setBatchActionModalState({ isOpen: false, action: '', orders: [] });
    } catch (error) {
      // Errors handled by mutation hooks
    }
  }, [
    batchActionModalState,
    processOrderMutation,
    fulfillOrderMutation,
    completeOrderMutation,
    deleteOrderMutation,
  ]);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: 'create' });
  }, []);

  // Define bulk actions for the table
  const bulkActions: BulkAction<Order>[] = useMemo(
    () => [
      {
        key: 'process',
        label: 'Process',
        icon: Play,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-blue-300',
          text: 'text-blue-700',
          hoverBg: 'hover:bg-blue-50',
        },
        onClick: orders => setBatchActionModalState({ isOpen: true, action: 'process', orders }),
        getValidItems: orders => orders.filter(o => o.status === 'pending'),
      },
      {
        key: 'fulfill',
        label: 'Fulfill',
        icon: Truck,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-purple-300',
          text: 'text-purple-700',
          hoverBg: 'hover:bg-purple-50',
        },
        onClick: orders => setBatchActionModalState({ isOpen: true, action: 'fulfill', orders }),
        getValidItems: orders => orders.filter(o => o.status === 'processing'),
      },
      {
        key: 'complete',
        label: 'Complete',
        icon: CheckCircle,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-green-300',
          text: 'text-green-700',
          hoverBg: 'hover:bg-green-50',
        },
        onClick: orders => setBatchActionModalState({ isOpen: true, action: 'complete', orders }),
        getValidItems: orders => orders.filter(o => o.status === 'shipped'),
      },
      {
        key: 'duplicate',
        label: 'Duplicate',
        icon: Copy,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-gray-300',
          text: 'text-gray-700',
          hoverBg: 'hover:bg-gray-50',
        },
        onClick: async orders => {
          const promises = orders.map(order => duplicateOrderMutation.mutateAsync(order.order_id));
          await Promise.all(promises);
        },
        isDisabled: () => duplicateOrderMutation.isPending,
        alwaysShow: true,
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-red-300',
          text: 'text-red-700',
          hoverBg: 'hover:bg-red-50',
        },
        onClick: orders => setBatchActionModalState({ isOpen: true, action: 'delete', orders }),
        getValidItems: orders => orders.filter(o => !['completed', 'shipped'].includes(o.status)),
      },
    ],
    [duplicateOrderMutation]
  );

  // Table columns configuration
  const columns = React.useMemo(
    () => [
      {
        accessorKey: 'order_id',
        header: 'Order ID',
        cell: ({ row }: { row: any }) => (
          <div className="font-mono text-sm">#{row.original.order_id.slice(-8).toUpperCase()}</div>
        ),
      },
      {
        accessorKey: 'clients',
        header: 'Client',
        cell: ({ row }: { row: any }) => {
          const order = row.original as Order;
          return (
            <div>
              {order.clients ? (
                <div>
                  <div className="font-medium">{order.clients.name}</div>
                  <div className="text-sm text-gray-600">{order.clients.email}</div>
                </div>
              ) : (
                <span className="text-gray-500">No client</span>
              )}
            </div>
          );
        },
        filterFn: (row: any, columnId: string, filterValue: string) => {
          if (!filterValue) return true;
          const order = row.original as Order;
          return order.clients?.name?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;
        },
        meta: {
          filterType: 'select',
          filterOptions: clients.map(client => ({
            label: client.name,
            value: client.name,
          })),
        },
      },
      {
        accessorKey: 'order_date',
        header: 'Date',
        enableColumnFilter: true,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm tabular-nums">{formatDate(row.original.order_date)}</div>
        ),
        filterFn: (row: any, columnId: string, filterValue: string) => {
          console.log('[OrdersPage] filterFn called with filterValue:', filterValue);

          if (!filterValue) {
            console.log('[OrdersPage] No filter value, returning true');
            return true;
          }

          const orderDate = new Date(row.original.order_date);
          console.log('[OrdersPage] Order date:', orderDate, 'Raw:', row.original.order_date);

          // Check if it's a date range (contains |)
          if (filterValue.includes('|')) {
            console.log('[OrdersPage] Date range filter detected');
            const [fromStr, toStr] = filterValue.split('|');
            const from = new Date(fromStr);
            const to = new Date(toStr);

            // Normalize dates to compare only date part (ignore time)
            const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            const fromDateOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
            const toDateOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());

            const result = orderDateOnly >= fromDateOnly && orderDateOnly <= toDateOnly;
            console.log('[OrdersPage] Range comparison:', { orderDateOnly, fromDateOnly, toDateOnly, result });
            return result;
          } else {
            console.log('[OrdersPage] Single date filter detected');
            // Single date filter
            const filterDate = new Date(filterValue);
            const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

            const result = orderDateOnly.getTime() === filterDateOnly.getTime();
            console.log('[OrdersPage] Single date comparison:', { orderDateOnly, filterDateOnly, result });
            return result;
          }
        },
        meta: {
          filterType: 'dateRange',
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: any }) => {
          const order = row.original as Order;
          const validTransitions = getValidStatusTransitions(order.status);
          const hasTransitions = validTransitions.length > 0;

          return (
            <div
              className="data-table-no-click relative z-10"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {hasTransitions ? (
                <Select
                  value={order.status}
                  onValueChange={value => handleStatusChange(order, value as Order['status'])}
                >
                  <SelectTrigger
                    className="w-32 h-8 relative z-10 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <OrderStatusBadge status={order.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {validTransitions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        <OrderStatusBadge status={status.value} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <OrderStatusBadge status={order.status} />
              )}
            </div>
          );
        },
        filterFn: (row: any, columnId: string, filterValue: string) => {
          if (!filterValue) return true;
          const order = row.original as Order;
          return order.status === filterValue;
        },
        meta: {
          filterType: 'select',
          filterOptions: ORDER_STATUS_OPTIONS.map(status => ({
            label: status.label,
            value: status.value,
          })),
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }: { row: any }) => (
          <div className="font-medium">${(row.original.total ?? row.original.total_price ?? 0).toFixed(2)}</div>
        ),
      },
    ],
    [handleStatusChange, clients]
  );


  return (
    <>
      <Helmet>
        <title>Orders - Betali</title>
      </Helmet>

      <div className="space-y-6">


        {/* Stats Cards */}
        {orderStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-blue-50">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {orderStats?.total_orders ?? 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-green-50">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          ${orderStats?.total_revenue?.toFixed(2) ?? '0.00'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-purple-50">
                    <ShoppingCart className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {orderStats?.orders_this_month ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${orderStats?.revenue_this_month?.toFixed(2) ?? '0.00'} revenue
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-orange-50">
                    <Filter className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {orderStats?.orders_by_status?.pending || 0}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table with Bulk Actions */}
        <TableWithBulkActions
          data={ordersData?.data || []}
          columns={columns}
          loading={isLoading}
          getRowId={(order: Order) => order.order_id}
          bulkActions={bulkActions}
          createButtonLabel="New Order"
          createButtonId="create-order-button"
          onCreateClick={handleCreateOrder}
          onRowDoubleClick={handleViewOrder}
          searchable={false}
          enableColumnFilters={true}
          enablePagination={true}
          pageSize={20}
          emptyMessage="No orders found. Get started by creating your first order."
        />
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        mode={modalState.mode}
        order={modalState.order}
      />

      {/* Batch Action Confirmation Modal */}
      <Modal
        isOpen={batchActionModalState.isOpen}
        onClose={() => setBatchActionModalState({ isOpen: false, action: '', orders: [] })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              Batch{' '}
              {batchActionModalState.action === 'process'
                ? 'Process'
                : batchActionModalState.action === 'fulfill'
                  ? 'Fulfill'
                  : batchActionModalState.action === 'complete'
                    ? 'Complete'
                    : 'Delete'}{' '}
              Orders
            </ModalTitle>
            <ModalDescription>
              {batchActionModalState.action === 'delete' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Are you sure you want to permanently delete{' '}
                      {batchActionModalState.orders.length} order(s)? This action cannot be undone.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Are you sure you want to {batchActionModalState.action}{' '}
                    {batchActionModalState.orders.length} order(s)?
                  </p>
                  {batchActionModalState.action === 'fulfill' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>This will deduct stock from inventory.</span>
                    </div>
                  )}
                </div>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setBatchActionModalState({ isOpen: false, action: '', orders: [] })}
            >
              Cancel
            </Button>
            <Button
              variant={batchActionModalState.action === 'delete' ? 'destructive' : 'default'}
              onClick={confirmBatchAction}
              disabled={
                processOrderMutation.isPending ||
                fulfillOrderMutation.isPending ||
                completeOrderMutation.isPending ||
                deleteOrderMutation.isPending
              }
            >
              {processOrderMutation.isPending ||
              fulfillOrderMutation.isPending ||
              completeOrderMutation.isPending ||
              deleteOrderMutation.isPending
                ? 'Processing...'
                : `${
                    batchActionModalState.action === 'process'
                      ? 'Process'
                      : batchActionModalState.action === 'fulfill'
                        ? 'Fulfill'
                        : batchActionModalState.action === 'complete'
                          ? 'Complete'
                          : 'Delete'
                  } Orders`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
