import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShoppingCart, Search, Plus, Eye, Edit, Trash, Copy, Filter, TrendingUp, Play, Truck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { data: clients } = useClients();
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

  const handleViewOrder = useCallback((order: Order) => {
    setModalState({ isOpen: true, mode: 'view', order });
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

  const handleDuplicateOrder = useCallback(async (order: Order) => {
    try {
      await duplicateOrderMutation.mutateAsync(order.order_id);
    } catch (error) {
      // Error handled by mutation hook
    }
  }, [duplicateOrderMutation]);

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

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: 'create' });
  }, []);

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
        return (
          <Select
            value={order.status}
            onValueChange={(value) => handleStatusChange(order, value as Order['status'])}
          >
            <SelectTrigger className="w-32 h-8">
              <OrderStatusBadge status={order.status} />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <OrderStatusBadge status={status.value} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: 'total_price',
      header: 'Total',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">${row.original.total_price.toFixed(2)}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: any }) => {
        const order = row.original as Order;
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewOrder(order)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditOrder(order)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            {/* Fulfillment Action Buttons */}
            {order.status === 'pending' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleProcessOrder(order)}
                disabled={processOrderMutation.isPending}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title="Mark as Processing"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            
            {order.status === 'processing' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFulfillOrder(order)}
                disabled={fulfillOrderMutation.isPending}
                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                title="Fulfill Order (Ship & Deduct Stock)"
              >
                <Truck className="h-4 w-4" />
              </Button>
            )}
            
            {order.status === 'shipped' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCompleteOrder(order)}
                disabled={completeOrderMutation.isPending}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                title="Mark as Completed"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDuplicateOrder(order)}
              disabled={duplicateOrderMutation.isPending}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteOrder(order)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [
    handleStatusChange, 
    handleViewOrder, 
    handleEditOrder, 
    handleDuplicateOrder, 
    handleDeleteOrder, 
    handleProcessOrder,
    handleFulfillOrder,
    handleCompleteOrder,
    duplicateOrderMutation.isPending,
    processOrderMutation.isPending,
    fulfillOrderMutation.isPending,
    completeOrderMutation.isPending
  ]);

  return (
    <>
      <Helmet>
        <title>Orders - Betali</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-gray-600">Manage your sales orders</p>
          </div>
          <Button onClick={handleCreateOrder} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
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
                  {clients?.data?.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              pageSize={20}
              onRowClick={handleViewOrder}
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
            <ModalTitle>Cancel Order</ModalTitle>
            <ModalDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
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
              {deleteOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}