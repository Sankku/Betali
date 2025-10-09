import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShoppingCart, Search, Plus, Trash, Copy, Filter, TrendingUp, Play, Truck, CheckCircle, AlertCircle, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    order: null as Order | null,
  });
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
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

    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (clientFilter !== 'all') {
      params.client_id = clientFilter;
    }

    return params;
  }, [searchQuery, statusFilter, clientFilter, currentPage]);

  // Hooks
  const { data: ordersData, isLoading } = useOrders(queryParams);
  const { data: orderStats } = useOrderStats();
  const { data: clientsResponse } = useClients();
  const clients = clientsResponse?.data || [];
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const duplicateOrderMutation = useDuplicateOrder();
  const processOrderMutation = useProcessOrder();
  const fulfillOrderMutation = useFulfillOrder();
  const completeOrderMutation = useCompleteOrder();

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = useCallback((status: Order['status'] | 'all') => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleClientFilter = useCallback((clientId: string) => {
    setClientFilter(clientId);
    setCurrentPage(1);
  }, []);

  const handleCreateOrder = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create' });
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setModalState({ isOpen: true, mode: 'edit', order });
  }, []);

  const handleDeleteOrder = useCallback((order: Order) => {
    setDeleteModalState({ isOpen: true, order });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteModalState.order) {
      try {
        await deleteOrderMutation.mutateAsync(deleteModalState.order.order_id);
        setDeleteModalState({ isOpen: false, order: null });
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  }, [deleteModalState.order, deleteOrderMutation]);

  const handleStatusChange = useCallback(async (order: Order, newStatus: Order['status']) => {
    try {
      await updateOrderStatusMutation.mutateAsync({
        orderId: order.order_id,
        status: newStatus,
      });
    } catch (error) {
      // Error handled by mutation hook
    }
  }, [updateOrderStatusMutation]);

  const handleProcessOrder = useCallback(async (order: Order) => {
    try {
      await processOrderMutation.mutateAsync(order.order_id);
    } catch (error) {
      // Error handled by mutation hook
    }
  }, [processOrderMutation]);

  const handleFulfillOrder = useCallback(async (order: Order) => {
    try {
      await fulfillOrderMutation.mutateAsync({
        orderId: order.order_id,
        fulfillmentData: {}
      });
    } catch (error) {
      // Error handled by mutation hook
    }
  }, [fulfillOrderMutation]);

  const handleCompleteOrder = useCallback(async (order: Order) => {
    try {
      await completeOrderMutation.mutateAsync(order.order_id);
    } catch (error) {
      // Error handled by mutation hook
    }
  }, [completeOrderMutation]);

  // Batch action handlers
  const handleBatchAction = useCallback((action: 'process' | 'fulfill' | 'complete' | 'delete') => {
    if (selectedOrders.length === 0) return;
    setBatchActionModalState({
      isOpen: true,
      action,
      orders: selectedOrders,
    });
  }, [selectedOrders]);

  const handleBatchDuplicate = useCallback(async () => {
    if (selectedOrders.length === 0) return;

    try {
      const promises = selectedOrders.map(order => duplicateOrderMutation.mutateAsync(order.order_id));
      await Promise.all(promises);
      setSelectedOrders([]);
    } catch (error) {
      // Errors handled by mutation hook
    }
  }, [selectedOrders, duplicateOrderMutation]);

  const confirmBatchAction = useCallback(async () => {
    const { action, orders } = batchActionModalState;
    if (!action || orders.length === 0) return;

    try {
      const promises = orders.map(order => {
        switch (action) {
          case 'process':
            return processOrderMutation.mutateAsync(order.order_id);
          case 'fulfill':
            return fulfillOrderMutation.mutateAsync({ orderId: order.order_id, fulfillmentData: {} });
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
      setSelectedOrders([]);
    } catch (error) {
      // Errors handled by mutation hooks
    }
  }, [batchActionModalState, processOrderMutation, fulfillOrderMutation, completeOrderMutation, deleteOrderMutation]);

  const handleSelectionChange = useCallback((selected: Order[]) => {
    setSelectedOrders(selected);
  }, []);

  const getValidOrdersForAction = useCallback((action: 'process' | 'fulfill' | 'complete' | 'delete') => {
    return selectedOrders.filter(order => {
      switch (action) {
        case 'process':
          return order.status === 'pending';
        case 'fulfill':
          return order.status === 'processing';
        case 'complete':
          return order.status === 'shipped';
        case 'delete':
          return !['completed', 'shipped'].includes(order.status);
        default:
          return false;
      }
    });
  }, [selectedOrders]);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: 'create' });
  }, []);

  // Clear selection when filters change
  React.useEffect(() => {
    setSelectedOrders([]);
  }, [searchQuery, statusFilter, clientFilter, currentPage]);

  // Table columns configuration for DataTable
  const columns = React.useMemo(() => [
    {
      accessorKey: 'order_id',
      header: 'Order ID',
      cell: ({ row }: { row: any }) => (
        <div className="font-mono text-sm">
          #{row.original.order_id.slice(-8).toUpperCase()}
        </div>
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
    },
    {
      accessorKey: 'order_date',
      header: 'Date',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm">
          {new Date(row.original.order_date).toLocaleDateString()}
        </div>
      ),
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
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            {hasTransitions ? (
              <Select
                value={order.status}
                onValueChange={(value) => handleStatusChange(order, value as Order['status'])}
              >
                <SelectTrigger className="w-32 h-8 relative z-10 cursor-pointer" style={{ pointerEvents: 'auto' }}>
                  <OrderStatusBadge status={order.status} />
                </SelectTrigger>
                <SelectContent>
                  {validTransitions.map((status) => (
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
    },
    {
      accessorKey: 'total_price',
      header: 'Total',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">${(row.original.total_price ?? 0).toFixed(2)}</div>
      ),
    },
  ], [handleStatusChange]);

  return (
    <>
      <Helmet>
        <title>Orders - Betali</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-gray-600">Manage your sales orders</p>
        </div>

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
                        <div className="text-lg font-medium text-gray-900">{orderStats?.total_orders ?? 0}</div>
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
                        <div className="text-lg font-medium text-gray-900">${orderStats?.total_revenue?.toFixed(2) ?? '0.00'}</div>
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
                        <div className="text-lg font-medium text-gray-900">{orderStats?.orders_this_month ?? 0}</div>
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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={handleClientFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toolbar - Always visible */}
              <div className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border",
                selectedOrders.length > 0
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              )}>
                {selectedOrders.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {selectedOrders.length} selected
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {getValidOrdersForAction('process').length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchAction('process')}
                          className="h-8 px-3 text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Process ({getValidOrdersForAction('process').length})
                        </Button>
                      )}
                      {getValidOrdersForAction('fulfill').length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchAction('fulfill')}
                          className="h-8 px-3 text-xs bg-white hover:bg-purple-50 border-purple-300 text-purple-700"
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          Fulfill ({getValidOrdersForAction('fulfill').length})
                        </Button>
                      )}
                      {getValidOrdersForAction('complete').length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchAction('complete')}
                          className="h-8 px-3 text-xs bg-white hover:bg-green-50 border-green-300 text-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete ({getValidOrdersForAction('complete').length})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchDuplicate}
                        disabled={duplicateOrderMutation.isPending}
                        className="h-8 px-3 text-xs bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicate ({selectedOrders.length})
                      </Button>
                      {getValidOrdersForAction('delete').length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchAction('delete')}
                          className="h-8 px-3 text-xs bg-white hover:bg-red-50 border-red-300 text-red-700"
                        >
                          <Trash className="h-3 w-3 mr-1" />
                          Delete ({getValidOrdersForAction('delete').length})
                        </Button>
                      )}
                      <Button
                        onClick={handleCreateOrder}
                        size="sm"
                        className="h-8 px-3 text-xs flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        New Order
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    <Button
                      onClick={handleCreateOrder}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Order
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={ordersData?.data || []}
              loading={isLoading}
              searchable={false}
              enablePagination={true}
              enableRowSelection={true}
              selectedRows={selectedOrders}
              onSelectionChange={handleSelectionChange}
              getRowId={(order: Order) => order.order_id}
              pageSize={20}
              onRowDoubleClick={handleEditOrder}
              emptyMessage="No orders found. Get started by creating your first order."
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        mode={modalState.mode}
        order={modalState.order}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, order: null })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Order</ModalTitle>
            <ModalDescription>
              Are you sure you want to permanently delete this order? This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalState({ isOpen: false, order: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? 'Deleting...' : 'Delete Order'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Batch Action Confirmation Modal */}
      <Modal 
        isOpen={batchActionModalState.isOpen} 
        onClose={() => setBatchActionModalState({ isOpen: false, action: '', orders: [] })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              Batch {batchActionModalState.action === 'process' ? 'Process' :
                    batchActionModalState.action === 'fulfill' ? 'Fulfill' :
                    batchActionModalState.action === 'complete' ? 'Complete' : 'Delete'} Orders
            </ModalTitle>
            <ModalDescription>
              {batchActionModalState.action === 'delete' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Are you sure you want to permanently delete {getValidOrdersForAction('delete').length} orders? This action cannot be undone.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Are you sure you want to {batchActionModalState.action} {getValidOrdersForAction(batchActionModalState.action).length} orders?
                  </p>
                  {batchActionModalState.action === 'fulfill' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>This will deduct stock from inventory.</span>
                    </div>
                  )}
                </div>
              )}

              {batchActionModalState.orders.length > getValidOrdersForAction(batchActionModalState.action).length && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {batchActionModalState.orders.length - getValidOrdersForAction(batchActionModalState.action).length} orders
                      will be skipped (invalid status for this action).
                    </span>
                  </div>
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
              disabled={processOrderMutation.isPending || fulfillOrderMutation.isPending ||
                       completeOrderMutation.isPending || deleteOrderMutation.isPending}
            >
              {(processOrderMutation.isPending || fulfillOrderMutation.isPending ||
                completeOrderMutation.isPending || deleteOrderMutation.isPending)
                ? 'Processing...'
                : `${batchActionModalState.action === 'process' ? 'Process' :
                     batchActionModalState.action === 'fulfill' ? 'Fulfill' :
                     batchActionModalState.action === 'complete' ? 'Complete' : 'Delete'} Orders`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}