import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ShoppingCart, Search, Copy, Filter, TrendingUp,
  Play, Truck, CheckCircle, Trash, AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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

export function OrdersPageRefactored() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
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

    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    if (clientFilter !== 'all') params.client_id = clientFilter;

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
  const handleCreateOrder = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create' });
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setModalState({ isOpen: true, mode: 'edit', order });
  }, []);

  // Define bulk actions
  const bulkActions: BulkAction<Order>[] = useMemo(() => [
    {
      key: 'process',
      label: 'Process',
      icon: Play,
      colorScheme: {
        bg: 'bg-white',
        border: 'border-blue-300',
        text: 'text-blue-700',
        hoverBg: 'hover:bg-blue-50'
      },
      onClick: (orders) => setBatchActionModalState({ isOpen: true, action: 'process', orders }),
      getValidItems: (orders) => orders.filter(o => o.status === 'pending'),
    },
    {
      key: 'fulfill',
      label: 'Fulfill',
      icon: Truck,
      colorScheme: {
        bg: 'bg-white',
        border: 'border-purple-300',
        text: 'text-purple-700',
        hoverBg: 'hover:bg-purple-50'
      },
      onClick: (orders) => setBatchActionModalState({ isOpen: true, action: 'fulfill', orders }),
      getValidItems: (orders) => orders.filter(o => o.status === 'processing'),
    },
    {
      key: 'complete',
      label: 'Complete',
      icon: CheckCircle,
      colorScheme: {
        bg: 'bg-white',
        border: 'border-green-300',
        text: 'text-green-700',
        hoverBg: 'hover:bg-green-50'
      },
      onClick: (orders) => setBatchActionModalState({ isOpen: true, action: 'complete', orders }),
      getValidItems: (orders) => orders.filter(o => o.status === 'shipped'),
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      colorScheme: {
        bg: 'bg-white',
        border: 'border-gray-300',
        text: 'text-gray-700',
        hoverBg: 'hover:bg-gray-50'
      },
      onClick: async (orders) => {
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
        hoverBg: 'hover:bg-red-50'
      },
      onClick: (orders) => setBatchActionModalState({ isOpen: true, action: 'delete', orders }),
      getValidItems: (orders) => orders.filter(o => !['completed', 'shipped'].includes(o.status)),
    },
  ], [duplicateOrderMutation]);

  // Batch action handler
  const confirmBatchAction = useCallback(async () => {
    const { action, orders } = batchActionModalState;
    if (!action || orders.length === 0) return;

    const validOrders = bulkActions
      .find(a => a.key === action)
      ?.getValidItems?.(orders) || orders;

    try {
      const promises = validOrders.map(order => {
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
    } catch (error) {
      // Errors handled by mutation hooks
    }
  }, [batchActionModalState, processOrderMutation, fulfillOrderMutation, completeOrderMutation, deleteOrderMutation, bulkActions]);

  // Table columns
  const columns = useMemo(() => [
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
        return order.clients ? (
          <div>
            <div className="font-medium">{order.clients.name}</div>
            <div className="text-sm text-gray-600">{order.clients.email}</div>
          </div>
        ) : (
          <span className="text-gray-500">No client</span>
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

        return validTransitions.length > 0 ? (
          <Select
            value={order.status}
            onValueChange={(value) => updateOrderStatusMutation.mutateAsync({
              orderId: order.order_id,
              status: value as Order['status']
            })}
          >
            <SelectTrigger className="w-32 h-8">
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
  ], [updateOrderStatusMutation]);

  // Filter components
  const filterComponents = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={(value: any) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}>
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

        <Select value={clientFilter} onValueChange={(value) => {
          setClientFilter(value);
          setCurrentPage(1);
        }}>
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
    </div>
  );

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

        {/* Stats Cards would go here... */}

        {/* Table with Bulk Actions */}
        <TableWithBulkActions
          data={ordersData?.data || []}
          columns={columns}
          loading={isLoading}
          getRowId={(order: Order) => order.order_id}
          bulkActions={bulkActions}
          createButtonLabel="New Order"
          onCreateClick={handleCreateOrder}
          onRowDoubleClick={handleEditOrder}
          searchable={false}
          enablePagination={true}
          pageSize={20}
          emptyMessage="No orders found. Get started by creating your first order."
          filterComponents={filterComponents}
        />
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
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
              Batch {batchActionModalState.action} Orders
            </ModalTitle>
            <ModalDescription>
              Are you sure you want to {batchActionModalState.action} the selected orders?
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
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
