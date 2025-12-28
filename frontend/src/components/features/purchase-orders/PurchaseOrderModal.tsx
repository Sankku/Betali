import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PurchaseOrderForm, PurchaseOrderFormData } from './PurchaseOrderForm';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PurchaseOrder } from '@/types/purchaseOrders';
import { useTranslation } from '@/contexts/LanguageContext';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  purchaseOrder?: PurchaseOrder;
}

export function PurchaseOrderModal({
  isOpen,
  onClose,
  mode,
  purchaseOrder,
}: PurchaseOrderModalProps) {
  const { t } = useTranslation();
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();

  // Initialize form
  const form = useForm<PurchaseOrderFormData>({
    defaultValues: {
      supplier_id: '',
      warehouse_id: '',
      expected_delivery_date: '',
      status: 'draft',
      items: [{ product_id: '', quantity: 1, unit_price: 0 }],
      discount_amount: 0,
      tax_amount: 0,
      shipping_amount: 0,
      notes: '',
    },
  });

  // Load purchase order data when editing or viewing
  useEffect(() => {
    if (purchaseOrder && (mode === 'edit' || mode === 'view')) {
      form.reset({
        supplier_id: purchaseOrder.supplier_id,
        warehouse_id: purchaseOrder.warehouse_id,
        expected_delivery_date: purchaseOrder.expected_delivery_date || '',
        status: purchaseOrder.status,
        items:
          purchaseOrder.purchase_order_details?.map((detail) => ({
            product_id: detail.product_id,
            quantity: detail.quantity,
            unit_price: detail.unit_price,
            notes: detail.notes || '',
          })) || [],
        discount_amount: purchaseOrder.discount_amount,
        tax_amount: purchaseOrder.tax_amount,
        shipping_amount: purchaseOrder.shipping_amount,
        notes: purchaseOrder.notes || '',
      });
    } else if (mode === 'create') {
      form.reset({
        supplier_id: '',
        warehouse_id: '',
        expected_delivery_date: '',
        status: 'draft',
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        discount_amount: 0,
        tax_amount: 0,
        shipping_amount: 0,
        notes: '',
      });
    }
  }, [purchaseOrder, mode, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PurchaseOrderFormData) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          supplier_id: data.supplier_id,
          warehouse_id: data.warehouse_id,
          expected_delivery_date: data.expected_delivery_date || undefined,
          status: data.status,
          items: data.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
          })),
          discount_amount: data.discount_amount || 0,
          tax_amount: data.tax_amount || 0,
          shipping_amount: data.shipping_amount || 0,
          notes: data.notes,
        });
        onClose();
      } else if (mode === 'edit' && purchaseOrder) {
        await updateMutation.mutateAsync({
          id: purchaseOrder.purchase_order_id,
          data: {
            supplier_id: data.supplier_id,
            warehouse_id: data.warehouse_id,
            expected_delivery_date: data.expected_delivery_date || undefined,
            items: data.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              notes: item.notes,
            })),
            discount_amount: data.discount_amount || 0,
            tax_amount: data.tax_amount || 0,
            shipping_amount: data.shipping_amount || 0,
            notes: data.notes,
          },
        });
        onClose();
      }
    } catch (error) {
      // Error handled by mutation hooks
      console.error('Error submitting purchase order:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isViewMode = mode === 'view';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mode === 'create'
              ? t('purchaseOrders.add')
              : mode === 'edit'
              ? t('purchaseOrders.edit')
              : t('purchaseOrders.view')}
          </ModalTitle>
          <button onClick={onClose} className="absolute right-4 top-4">
            <X className="h-5 w-5" />
          </button>
        </ModalHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            <PurchaseOrderForm form={form} mode={mode} isLoading={isLoading} />
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {isViewMode ? t('common.close') : t('common.cancel')}
            </Button>
            {!isViewMode && (
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('common.loading')
                  : mode === 'create'
                  ? t('common.create')
                  : t('common.save')}
              </Button>
            )}
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
