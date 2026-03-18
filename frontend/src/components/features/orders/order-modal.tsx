import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ShoppingCart } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { ModalForm } from '@/components/templates/modal-form';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { OrderForm } from './order-form';
import { OrderDetails } from './order-details';
import { Order, CreateOrderData, UpdateOrderData } from '@/services/api/orderService';
import { useCreateOrder, useUpdateOrder, useOrder } from '@/hooks/useOrders';

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
  tax_rate_ids: string[];
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
}

export function OrderModal({ isOpen, onClose, mode, order }: OrderModalProps) {
  const { t } = useTranslation();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();

  // Fetch full order details when in view or edit mode (to get order_details/items)
  const shouldFetchDetails = (mode === 'view' || mode === 'edit') && !!order?.order_id && isOpen;
  const { data: fullOrder, isLoading: isLoadingOrder } = useOrder(
    shouldFetchDetails ? order!.order_id : ''
  );

  // Use fullOrder if available (with complete details), otherwise use the order from props
  // Extract .data from fullOrder if it has the wrapped structure
  const resolvedFullOrder = shouldFetchDetails
    ? fullOrder && 'data' in fullOrder
      ? (fullOrder as any).data
      : fullOrder
    : order;

  const displayOrder = resolvedFullOrder;

  const form = useForm<OrderFormData>({
    defaultValues: {
      client_id: order?.client_id || 'no-client',
      warehouse_id: order?.warehouse_id || 'no-warehouse',
      status: order?.status || 'draft',
      notes: order?.notes || '',
      tax_rate_ids: [],
      items: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        form.reset({
          client_id: 'no-client',
          warehouse_id: 'no-warehouse',
          status: 'draft',
          notes: '',
          tax_rate_ids: [],
          items: [{ product_id: '', quantity: 1, price: 0 }],
        });
      } else if (mode === 'edit' && resolvedFullOrder) {
        const details = resolvedFullOrder.order_details ?? [];
        // Only reset once we have real detail records (list items won't have product_id)
        if (details.length === 0 || !details[0]?.product_id) return;
        form.reset({
          client_id: resolvedFullOrder.client_id || 'no-client',
          warehouse_id: resolvedFullOrder.warehouse_id || 'no-warehouse',
          status: resolvedFullOrder.status,
          notes: resolvedFullOrder.notes || '',
          // tax_rate_ids can't be restored from saved order (backend stores tax_amount, not which rates)
          tax_rate_ids: (resolvedFullOrder as any).tax_rate_ids ?? [],
          items: details.map((detail: any) => ({
            product_id: detail.product_id,
            quantity: detail.quantity,
            price: detail.price,
          })),
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, resolvedFullOrder]);

  const handleSubmit = async (data: OrderFormData) => {
    try {
      // Validate that all items have a product selected
      if (!data.warehouse_id || data.warehouse_id === 'no-warehouse') {
        toast.error(t('orders.validation.selectWarehouse'));
        return;
      }

      const itemsWithProduct = data.items.filter(item => item.product_id && item.quantity > 0);
      if (itemsWithProduct.length === 0) {
        toast.error(t('orders.validation.addProduct'));
        return;
      }
      if (data.items.some(item => !item.product_id)) {
        toast.error(t('orders.validation.allItemsNeedProduct'));
        return;
      }

      const orderData = {
        ...data,
        client_id: data.client_id && data.client_id !== 'no-client' ? data.client_id : undefined,
        warehouse_id: data.warehouse_id && data.warehouse_id !== 'no-warehouse' ? data.warehouse_id : undefined,
        notes: data.notes || undefined,
        items: itemsWithProduct,
      };

      if (mode === 'create') {
        await createOrderMutation.mutateAsync(orderData as CreateOrderData);
      } else if (mode === 'edit' && order) {
        await updateOrderMutation.mutateAsync({
          orderId: order.order_id,
          orderData: orderData as UpdateOrderData,
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
        return t('orders.modal.createTitle');
      case 'edit':
        return t('orders.modal.editTitle');
      case 'view':
        return t('orders.modal.viewTitle', { id: order?.order_id.slice(-8).toUpperCase() });
      default:
        return t('orders.modal.defaultTitle');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('orders.modal.createDescription');
      case 'edit':
        return t('orders.modal.editDescription');
      case 'view':
        return t('orders.modal.viewDescription');
      default:
        return '';
    }
  };

  const isSubmitting = createOrderMutation.isPending || updateOrderMutation.isPending;
  const isLoadingEditData = mode === 'edit' && isLoadingOrder;

  // Handle view mode separately since it has different layout
  if (mode === 'view') {
    // Show loading state while fetching OR if we don't have data yet
    if (isLoadingOrder || !displayOrder) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="full"
          className="!max-w-[95vw] lg:!max-w-[85vw] xl:!max-w-[80vw]"
        >
          <ModalContent className="">
            <ModalHeader>
              <ModalTitle>{t('orders.modal.loading')}</ModalTitle>
            </ModalHeader>
            <div className="p-6 flex items-center justify-center min-h-[400px]">
              <div className="text-gray-500">{t('orders.modal.loadingDetails')}</div>
            </div>
          </ModalContent>
        </Modal>
      );
    }

    // Render order details once we have the data
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        className="!max-w-[95vw] lg:!max-w-[85vw] xl:!max-w-[80vw]"
      >
        <ModalContent className="max-h-[95vh] overflow-y-auto">
          <div className="p-6">
            <OrderDetails order={displayOrder} onClose={onClose} />
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
      <OrderForm form={form} mode={mode} isLoading={isSubmitting || isLoadingEditData} />
    </ModalForm>
  );
}

export default OrderModal;
