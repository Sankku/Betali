import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/modal';
import { PurchaseOrder, ReceiptLine } from '@/types/purchaseOrders';
import { ReceiptLineRow } from './ReceiptLineRow';
import { useReceivePurchaseOrder, usePurchaseOrder } from '@/hooks/usePurchaseOrders';

interface ReceivePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
}

export function ReceivePurchaseOrderModal({
  isOpen,
  onClose,
  purchaseOrder,
}: ReceivePurchaseOrderModalProps) {
  const receiveMutation = useReceivePurchaseOrder();

  // Fetch full PO so we get real detail rows (list response has [{count:N}] aggregates).
  // Use isFetching (not isFetching) so stale cache data doesn't flash "already received"
  // while the background refetch completes.
  const { data: fullPO, isFetching } = usePurchaseOrder(purchaseOrder.purchase_order_id, isOpen);
  const resolvedPO = fullPO ?? purchaseOrder;

  // Only show lines that are not yet fully received
  const pendingDetails = useMemo(
    () =>
      (resolvedPO.purchase_order_details ?? []).filter(
        (d): d is NonNullable<typeof d> =>
          'detail_id' in d && d.detail_id != null && d.received_quantity < d.quantity
      ),
    [resolvedPO.purchase_order_details]
  );

  // Local state: map of detail_id → partial ReceiptLine
  // Derived from pendingDetails; re-initializes whenever the full PO loads
  const [lineState, setLineState] = useState<Record<string, Partial<ReceiptLine>>>({});

  // Populate lineState once real detail rows are available
  const detailsKey = pendingDetails.map((d) => d.detail_id).join(',');
  React.useEffect(() => {
    if (pendingDetails.length === 0) return;
    setLineState(
      Object.fromEntries(
        pendingDetails.map((d) => [
          d.detail_id,
          {
            detail_id: d.detail_id,
            received_quantity: d.quantity - (d.received_quantity || 0),
            lot: d.lot_id
              ? undefined
              : {
                  mode: 'new' as const,
                  lot_number: '',
                  expiration_date: '',
                  origin_country: '',
                  price: d.unit_price,
                },
          },
        ])
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsKey]);

  const hasAtLeastOneLine = Object.values(lineState).some(
    (l) => (l.received_quantity ?? 0) > 0
  );

  const isValid = useMemo(() => {
    if (!hasAtLeastOneLine) return false;
    return Object.entries(lineState).every(([detailId, line]) => {
      if ((line.received_quantity ?? 0) === 0) return true; // zero lines are skipped
      const detail = pendingDetails.find((d) => d.detail_id === detailId);
      if (!detail) return false;
      if (detail.lot_id) return true; // existing lot, no validation needed
      if (!line.lot) return false;
      if (line.lot.mode === 'new') {
        const l = line.lot;
        return !!l.lot_number && !!l.expiration_date;
      }
      if (line.lot.mode === 'existing') {
        return !!line.lot.lot_id;
      }
      return false;
    });
  }, [lineState, pendingDetails, hasAtLeastOneLine]);

  const handleConfirm = async () => {
    // Build payload — exclude zero-qty lines
    const lines: ReceiptLine[] = Object.values(lineState)
      .filter((l) => (l.received_quantity ?? 0) > 0)
      .map((l) => ({
        detail_id: l.detail_id!,
        received_quantity: l.received_quantity!,
        lot: l.lot as ReceiptLine['lot'],
      }));

    try {
      await receiveMutation.mutateAsync({ id: purchaseOrder.purchase_order_id, lines });
      onClose();
    } catch {
      // Error toast handled by hook
    }
  };

  const warehouseName =
    (purchaseOrder.warehouse as { name?: string } | undefined)?.name ?? purchaseOrder.warehouse_id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent className="max-h-[90vh] flex flex-col">
        <ModalHeader className="flex-shrink-0">
          <ModalTitle>Recibir OC #{purchaseOrder.purchase_order_number}</ModalTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Almacen destino: {warehouseName}
          </p>
          <button onClick={onClose} className="absolute right-4 top-4">
            <X className="h-5 w-5" />
          </button>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando detalles...</p>
          ) : pendingDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Todos los productos ya fueron recibidos completamente.
            </p>
          ) : (
            pendingDetails.map((detail) => (
              <ReceiptLineRow
                key={detail.detail_id}
                detail={detail}
                value={lineState[detail.detail_id] ?? {}}
                onChange={(updated) =>
                  setLineState((prev) => ({ ...prev, [detail.detail_id]: updated }))
                }
              />
            ))
          )}
        </div>

        <ModalFooter className="flex-shrink-0 flex flex-col-reverse justify-end sm:flex-row gap-3 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={receiveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || receiveMutation.isPending || pendingDetails.length === 0}
          >
            {receiveMutation.isPending ? 'Procesando...' : 'Confirmar recepcion'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
