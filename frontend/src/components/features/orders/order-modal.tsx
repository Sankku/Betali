import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ShoppingCart } from 'lucide-react';
import { ModalForm } from '@/components/templates/modal-form';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { OrderForm } from './order-form';
import { OrderDetails } from './order-details';
import { Order, CreateOrderData, UpdateOrderData } from '@/services/api/orderService';
import { useCreateOrder, useUpdateOrder } from '@/hooks/useOrders';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  order?: Order;
}

interface OrderFormData {
  client_id: string;
  warehouse_id: string;
  status: Order['status'];
  notes: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
}

export function OrderModal({ isOpen, onClose, mode, order }: OrderModalProps) {
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();

  const form = useForm<OrderFormData>({
    defaultValues: {
      client_id: order?.client_id || 'no-client',
      warehouse_id: order?.warehouse_id || 'no-warehouse', 
      status: order?.status || 'draft',
      notes: order?.notes || '',
      items: []
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        form.reset({
          client_id: 'no-client',
          warehouse_id: 'no-warehouse',
          status: 'draft',
          notes: '',
          items: [{ product_id: '', quantity: 1, price: 0 }]
        });
      } else if (order && (mode === 'edit' || mode === 'view')) {
        form.reset({
          client_id: order.client_id || 'no-client',
          warehouse_id: order.warehouse_id || 'no-warehouse',
          status: order.status,
          notes: order.notes || '',
          items: order.order_details?.map(detail => ({
            product_id: detail.product_id,
            quantity: detail.quantity,
            price: detail.price
          })) || []
        });
      }
    }
  }, [isOpen, mode, order, form]);

  const handleSubmit = async (data: OrderFormData) => {
    try {
      const orderData = {
        ...data,
        client_id: data.client_id === 'no-client' ? undefined : data.client_id,
        warehouse_id: data.warehouse_id === 'no-warehouse' ? undefined : data.warehouse_id,
        notes: data.notes || undefined,
      };

      if (mode === 'create') {
        await createOrderMutation.mutateAsync(orderData as CreateOrderData);
      } else if (mode === 'edit' && order) {
        await updateOrderMutation.mutateAsync({
          orderId: order.order_id,
          orderData: orderData as UpdateOrderData
        });
      }
      onClose();
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Order';
      case 'edit':
        return 'Edit Order';
      case 'view':
        return `Order #${order?.order_id.slice(-8).toUpperCase()}`;
      default:
        return 'Order';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Create a new order with products and customer information.';
      case 'edit':
        return 'Modify the order details and items.';
      case 'view':
        return 'View detailed information about this order.';
      default:
        return '';
    }
  };

  const isSubmitting = createOrderMutation.isPending || updateOrderMutation.isPending;

  // Handle view mode separately since it has different layout
  if (mode === 'view') {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>{getModalTitle()}</ModalTitle>
          </ModalHeader>
          
          <div className="p-6">
            <OrderDetails order={order!} onClose={onClose} />
          </div>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={ShoppingCart}
      mode={mode}
      isLoading={isSubmitting}
      size="xl"
    >
      <OrderForm
        form={form}
        mode={mode}
        isLoading={isSubmitting}
      />
    </ModalForm>
  );
}

export default OrderModal;