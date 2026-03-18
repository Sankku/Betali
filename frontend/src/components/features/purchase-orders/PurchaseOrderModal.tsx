import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PurchaseOrderForm, PurchaseOrderFormData } from './PurchaseOrderForm';
import { PurchaseOrderDetails } from './PurchaseOrderDetails';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, usePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PurchaseOrder } from '@/types/purchaseOrders';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/lib/toast';

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

  // Fetch full purchase order (with details/items) when viewing or editing
  const shouldFetch = (mode === 'view' || mode === 'edit') && !!purchaseOrder?.purchase_order_id && isOpen;
  const { data: fullPurchaseOrder, isLoading: isLoadingDetails } = usePurchaseOrder(
    shouldFetch ? purchaseOrder!.purchase_order_id : '',
    shouldFetch
  );
  const resolvedOrder = shouldFetch ? (fullPurchaseOrder ?? purchaseOrder) : purchaseOrder;

  // ─── VIEW MODE: render a clean read-only details layout (no form) ───
  if (mode === 'view') {
    if (!isOpen) return null;

    if (isLoadingDetails || !resolvedOrder) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalContent className="!max-w-[95vw] lg:!max-w-[85vw] xl:!max-w-[80vw]">
            <ModalHeader>
              <ModalTitle>{t('purchaseOrders.modal.viewTitle')}</ModalTitle>
              <button onClick={onClose} className="absolute right-4 top-4">
                <X className="h-5 w-5" />
              </button>
            </ModalHeader>
            <div className="px-6 py-12 flex items-center justify-center text-neutral-500">
              {t('purchaseOrders.modal.loadingDetails')}
            </div>
          </ModalContent>
        </Modal>
      );
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalContent className="max-h-[95vh] overflow-y-auto !max-w-[95vw] lg:!max-w-[85vw] xl:!max-w-[80vw]">
          <div className="px-6 py-6">
            <PurchaseOrderDetails order={resolvedOrder} onClose={onClose} />
          </div>
        </ModalContent>
      </Modal>
    );
  }

  // ─── CREATE / EDIT MODE: form-based modal ───
  return <PurchaseOrderFormModal
    isOpen={isOpen}
    onClose={onClose}
    mode={mode}
    purchaseOrder={purchaseOrder}
    resolvedOrder={resolvedOrder}
    isLoadingDetails={isLoadingDetails}
    shouldFetch={shouldFetch}
    createMutation={createMutation}
    updateMutation={updateMutation}
    t={t}
  />;
}

// Separate component so the form's useForm/useEffect only mount in create/edit mode
function PurchaseOrderFormModal({
  isOpen,
  onClose,
  mode,
  purchaseOrder,
  resolvedOrder,
  isLoadingDetails,
  shouldFetch,
  createMutation,
  updateMutation,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  purchaseOrder?: PurchaseOrder;
  resolvedOrder?: PurchaseOrder;
  isLoadingDetails: boolean;
  shouldFetch: boolean;
  createMutation: ReturnType<typeof useCreatePurchaseOrder>;
  updateMutation: ReturnType<typeof useUpdatePurchaseOrder>;
  t: (key: string) => string;
}) {
  // Pre-populate from list data so the form is never blank on open.
  // When full order loads (via usePurchaseOrder), the useEffect below replaces items with real data.
  const editDefaults = mode === 'edit' && purchaseOrder
    ? {
        supplier_id: purchaseOrder.supplier_id || '',
        warehouse_id: purchaseOrder.warehouse_id || '',
        expected_delivery_date: purchaseOrder.expected_delivery_date || '',
        status: purchaseOrder.status,
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        discount_amount: purchaseOrder.discount_amount || 0,
        tax_amount: purchaseOrder.tax_amount || 0,
        shipping_amount: purchaseOrder.shipping_amount || 0,
        notes: purchaseOrder.notes || '',
      }
    : {
        supplier_id: '',
        warehouse_id: '',
        expected_delivery_date: '',
        status: 'draft' as const,
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        discount_amount: 0,
        tax_amount: 0,
        shipping_amount: 0,
        notes: '',
      };

  const form = useForm<PurchaseOrderFormData>({ defaultValues: editDefaults });

  useEffect(() => {
    if (!isOpen || mode !== 'edit' || !resolvedOrder) return;
    // Only reset once we have real detail records (list response has [{count:N}] without product_id)
    const realDetails = resolvedOrder.purchase_order_details?.filter(
      (d): d is NonNullable<typeof d> => 'product_id' in d && d.product_id != null
    ) ?? [];
    if (!realDetails.length) return;
    form.reset({
      supplier_id: resolvedOrder.supplier_id || '',
      warehouse_id: resolvedOrder.warehouse_id || '',
      expected_delivery_date: resolvedOrder.expected_delivery_date || '',
      status: resolvedOrder.status,
      items: realDetails.map((detail) => ({
        product_id: detail.product_id,
        quantity: detail.quantity,
        unit_price: detail.unit_price,
        notes: detail.notes || '',
      })),
      discount_amount: resolvedOrder.discount_amount || 0,
      tax_amount: resolvedOrder.tax_amount || 0,
      shipping_amount: resolvedOrder.shipping_amount || 0,
      notes: resolvedOrder.notes || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrder, mode, isOpen]);

  const onSubmit = async (data: PurchaseOrderFormData) => {
    const valid = await form.trigger(['supplier_id', 'warehouse_id']);
    if (!valid) return;

    const invalidItem = data.items.find(
      (item) => !item.product_id || item.unit_price <= 0 || item.quantity <= 0
    );
    if (invalidItem) {
      toast.error(t('purchaseOrders.modal.validationError'));
      return;
    }

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
      } else if (purchaseOrder) {
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
      console.error('Error submitting purchase order:', error);
    }
  };

  const isLoading =
    createMutation.isPending || updateMutation.isPending || (shouldFetch && isLoadingDetails);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mode === 'create' ? t('purchaseOrders.add') : t('purchaseOrders.edit')}
          </ModalTitle>
          <button onClick={onClose} className="absolute right-4 top-4">
            <X className="h-5 w-5" />
          </button>
        </ModalHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            <PurchaseOrderForm form={form} mode={mode} isLoading={isLoading} />
          </div>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.loading')
                : mode === 'create'
                ? t('common.create')
                : t('common.save')}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
