import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Copy,
  FileText,
  Clock,
  Truck,
  FileDown,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import { PdfPreviewModal, PdfOrderItem } from '@/components/ui/pdf-preview-modal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { ReceivePurchaseOrderModal } from './ReceivePurchaseOrderModal';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
  useCancelPurchaseOrder,
  useApprovePurchaseOrder,
  useSubmitPurchaseOrder,
  useDeletePurchaseOrder,
  useDuplicatePurchaseOrder,
  PURCHASE_ORDER_STATUS_OPTIONS,
} from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouse';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  getAvailableStatusTransitions,
} from '@/types/purchaseOrders';
import { purchaseOrdersService } from '@/services/api/purchaseOrdersService';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  purchaseOrder?: PurchaseOrder;
}

export function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [batchActionModalState, setBatchActionModalState] = useState<{
    isOpen: boolean;
    action: 'receive' | 'approve' | 'submit' | 'cancel' | '';
    purchaseOrders: PurchaseOrder[];
  }>({
    isOpen: false,
    action: '',
    purchaseOrders: [],
  });
  const [pdfPreviewState, setPdfPreviewState] = useState({
    isOpen: false,
    orders: [] as PdfOrderItem[],
  });
  const [receiveModalState, setReceiveModalState] = useState<{
    isOpen: boolean;
    purchaseOrder?: PurchaseOrder;
  }>({ isOpen: false });
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    purchaseOrder?: PurchaseOrder;
  }>({ isOpen: false });
  const [showCancelled, setShowCancelled] = useState(false);

  // Build filters
  const filters = useMemo(() => {
    const f: any = {};
    if (statusFilter !== 'all') f.status = statusFilter;
    if (supplierFilter !== 'all') f.supplier_id = supplierFilter;
    if (warehouseFilter !== 'all') f.warehouse_id = warehouseFilter;
    if (searchTerm) f.search = searchTerm;
    return f;
  }, [statusFilter, supplierFilter, warehouseFilter, searchTerm]);

  // Hooks
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders({ filters });

  const displayedOrders = useMemo(() => {
    if (showCancelled || statusFilter === 'cancelled') return purchaseOrders;
    return purchaseOrders.filter((o) => o.status !== 'cancelled');
  }, [purchaseOrders, showCancelled, statusFilter]);
  const { data: suppliers = [] } = useSuppliers({ searchOptions: { active_only: true } });
  const { data: warehouses } = useWarehouses();
  const updateStatusMutation = useUpdatePurchaseOrderStatus();
  const cancelMutation = useCancelPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();
  const duplicateMutation = useDuplicatePurchaseOrder();

  // Handlers
  const handleCreatePurchaseOrder = useCallback(() => {
    setModalState({ isOpen: true, mode: 'create' });
  }, []);

  const handleViewPurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    setModalState({ isOpen: true, mode: 'view', purchaseOrder });
  }, []);

  const handleEditPurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    setModalState({ isOpen: true, mode: 'edit', purchaseOrder });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: 'create' });
  }, []);

  const handleDeletePurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    setDeleteConfirmState({ isOpen: true, purchaseOrder });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.purchaseOrder) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmState.purchaseOrder.purchase_order_id);
      setDeleteConfirmState({ isOpen: false });
    } catch {
      // handled in hook
    }
  }, [deleteConfirmState.purchaseOrder, deleteMutation]);

  const handleDuplicatePurchaseOrder = useCallback(async (purchaseOrder: PurchaseOrder) => {
    try {
      await duplicateMutation.mutateAsync(purchaseOrder.purchase_order_id);
    } catch {
      // handled in hook
    }
  }, [duplicateMutation]);

  // Batch action confirmation handler
  const confirmBatchAction = useCallback(async () => {
    const { action, purchaseOrders: orders } = batchActionModalState;
    if (!action || orders.length === 0) return;

    try {
      const promises = orders.map((order) => {
        switch (action) {
          case 'approve':
            return approveMutation.mutateAsync(order.purchase_order_id);
          case 'submit':
            return submitMutation.mutateAsync(order.purchase_order_id);
          case 'cancel':
            return cancelMutation.mutateAsync(order.purchase_order_id);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      setBatchActionModalState({ isOpen: false, action: '', purchaseOrders: [] });
    } catch (error) {
      // Error handled by mutation hooks
    }
  }, [batchActionModalState, approveMutation, submitMutation, cancelMutation]);

  /**
   * Get status badge color
   */
  const getStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    const color = STATUS_COLORS[status];
    switch (color) {
      case 'green':
        return 'success';
      case 'blue':
        return 'default';
      case 'yellow':
        return 'warning';
      case 'red':
        return 'destructive';
      case 'gray':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Define bulk actions for the table
  const bulkActions: BulkAction<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: 'submit',
        label: t('purchaseOrders.actions.submit'),
        icon: FileText,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-blue-300',
          text: 'text-blue-700',
          hoverBg: 'hover:bg-blue-50',
        },
        onClick: (orders) =>
          setBatchActionModalState({ isOpen: true, action: 'submit', purchaseOrders: orders }),
        getValidItems: (orders) => orders.filter((o) => o.status === 'draft'),
      },
      {
        key: 'approve',
        label: t('purchaseOrders.actions.approve'),
        icon: CheckCircle,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-green-300',
          text: 'text-green-700',
          hoverBg: 'hover:bg-green-50',
        },
        onClick: (orders) =>
          setBatchActionModalState({ isOpen: true, action: 'approve', purchaseOrders: orders }),
        getValidItems: (orders) => orders.filter((o) => o.status === 'pending' || o.status === 'draft'),
      },
      {
        key: 'receive',
        label: t('purchaseOrders.actions.receive'),
        icon: Truck,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-purple-300',
          text: 'text-purple-700',
          hoverBg: 'hover:bg-purple-50',
        },
        onClick: (orders) => {
          if (orders.length > 1) {
            toast.info('Solo se puede recibir una OC a la vez. Procesando la primera seleccionada.');
          }
          setReceiveModalState({ isOpen: true, purchaseOrder: orders[0] });
        },
        getValidItems: (orders) =>
          orders.filter((o) => o.status === 'approved' || o.status === 'partially_received'),
      },
      {
        key: 'download-pdf',
        label: 'PDF',
        icon: FileDown,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-indigo-300',
          text: 'text-indigo-700',
          hoverBg: 'hover:bg-indigo-50',
        },
        onClick: (orders) => {
          const pdfOrders: PdfOrderItem[] = orders.map((order) => ({
            id: order.purchase_order_id,
            label: `${order.purchase_order_number} - ${order.suppliers?.name || t('purchaseOrders.page.noSupplier')}`,
          }));
          setPdfPreviewState({ isOpen: true, orders: pdfOrders });
        },
        alwaysShow: true,
      },
      {
        key: 'cancel',
        label: t('purchaseOrders.actions.cancel'),
        icon: XCircle,
        colorScheme: {
          bg: 'bg-white',
          border: 'border-red-300',
          text: 'text-red-700',
          hoverBg: 'hover:bg-red-50',
        },
        onClick: (orders) =>
          setBatchActionModalState({ isOpen: true, action: 'cancel', purchaseOrders: orders }),
        getValidItems: (orders) =>
          orders.filter((o) => !['cancelled', 'received'].includes(o.status)),
      },
    ],
    []
  );

  // Table columns configuration
  const columns = useMemo(
    () => [
      {
        accessorKey: 'purchase_order_number',
        header: t('purchaseOrders.fields.orderNumber'),
        cell: ({ row }: { row: any }) => (
          <div className="font-semibold text-foreground">{row.original.purchase_order_number}</div>
        ),
      },
      {
        accessorKey: 'suppliers',
        header: t('purchaseOrders.fields.supplier'),
        cell: ({ row }: { row: any }) => {
          const order = row.original as PurchaseOrder;
          return (
            <div className="font-medium text-foreground">
              {order.suppliers?.name || 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'warehouse',
        header: t('purchaseOrders.fields.warehouse'),
        cell: ({ row }: { row: any }) => {
          const order = row.original as PurchaseOrder;
          return (
            <div className="font-medium text-foreground">{order.warehouse?.name || 'N/A'}</div>
          );
        },
      },
      {
        accessorKey: 'order_date',
        header: t('purchaseOrders.fields.date'),
        cell: ({ row }: { row: any }) => (
          <div className="font-medium text-foreground">{formatDate(row.original.order_date)}</div>
        ),
      },
      {
        accessorKey: 'expected_delivery_date',
        header: t('purchaseOrders.fields.expectedDelivery'),
        cell: ({ row }: { row: any }) => (
          <div className="font-medium text-foreground">
            {row.original.expected_delivery_date
              ? formatDate(row.original.expected_delivery_date)
              : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('purchaseOrders.fields.status'),
        cell: ({ row }: { row: any }) => {
          const order = row.original as PurchaseOrder;
          const localeKey = order.status.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
          const colorClasses: Record<string, string> = {
            gray:   'bg-gray-100 text-gray-800 border-gray-200',
            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            blue:   'bg-blue-100 text-blue-800 border-blue-200',
            orange: 'bg-orange-100 text-orange-800 border-orange-200',
            green:  'bg-green-100 text-green-800 border-green-200',
            red:    'bg-red-100 text-red-800 border-red-200',
          };
          const color = STATUS_COLORS[order.status] ?? 'gray';
          return (
            <Badge variant="outline" className={colorClasses[color]}>
              {t(`purchaseOrders.status.${localeKey}`)}
            </Badge>
          );
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
          if (!filterValue) return true;
          return (row.original as PurchaseOrder).status === filterValue;
        },
        meta: {
          filterType: 'select',
          filterOptions: PURCHASE_ORDER_STATUS_OPTIONS.map(option => {
            const localeKey = option.value.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
            return { label: t(`purchaseOrders.status.${localeKey}`), value: option.value };
          }),
        },
      },
      {
        accessorKey: 'total',
        header: t('purchaseOrders.fields.total'),
        cell: ({ row }: { row: any }) => (
          <div className="text-right font-semibold text-foreground">
            ${row.original.total.toFixed(2)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }: { row: any }) => {
          const order = row.original as PurchaseOrder;
          const canEdit = order.status === 'draft';
          const canDelete = ['draft', 'pending'].includes(order.status);
          const canApprove = ['draft', 'pending'].includes(order.status);
          return (
            <div
              className="data-table-no-click flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewPurchaseOrder(order)}
                title="Ver"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditPurchaseOrder(order)}
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {canApprove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => approveMutation.mutate(order.purchase_order_id)}
                  disabled={approveMutation.isPending}
                  title="Aprobar"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDuplicatePurchaseOrder(order)}
                disabled={duplicateMutation.isPending}
                title="Duplicar como borrador"
                className="text-neutral-500 hover:text-neutral-700"
              >
                <Copy className="h-4 w-4" />
              </Button>

              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePurchaseOrder(order)}
                  title="Eliminar"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleViewPurchaseOrder, handleEditPurchaseOrder, handleDuplicatePurchaseOrder, handleDeletePurchaseOrder, duplicateMutation.isPending, approveMutation, getStatusBadgeVariant, t]
  );

  // Filter components
  const filterComponents = (
    <div className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('purchaseOrders.page.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
        <SelectTrigger>
          <SelectValue placeholder={t('purchaseOrders.page.filterStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('purchaseOrders.page.allStatuses')}</SelectItem>
          {PURCHASE_ORDER_STATUS_OPTIONS.map((option) => {
            const localeKey = option.value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            return (
              <SelectItem key={option.value} value={option.value}>
                {t(`purchaseOrders.status.${localeKey}`)}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Supplier Filter */}
      <Select value={supplierFilter} onValueChange={setSupplierFilter}>
        <SelectTrigger>
          <SelectValue placeholder={t('purchaseOrders.fields.supplier')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('purchaseOrders.page.allSuppliers')}</SelectItem>
          {suppliers?.map((supplier) => (
            <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
              {supplier.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Warehouse Filter */}
      <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
        <SelectTrigger>
          <SelectValue placeholder={t('purchaseOrders.fields.warehouse')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('purchaseOrders.page.allWarehouses')}</SelectItem>
          {warehouses?.data?.map((warehouse) => (
            <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
              {warehouse.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={showCancelled}
        onClick={() => setShowCancelled((v) => !v)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          showCancelled ? 'bg-blue-500' : 'bg-zinc-500'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            showCancelled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-muted-foreground">Mostrar canceladas</span>
    </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{t('purchaseOrders.title')} - Betali</title>
      </Helmet>

      <div className="space-y-6">


        {/* Table with Bulk Actions */}
        <TableWithBulkActions
          data={displayedOrders}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.purchase_order_id}
          bulkActions={bulkActions}
          createButtonLabel={t('purchaseOrders.add')}
          onCreateClick={handleCreatePurchaseOrder}
          filterComponents={filterComponents}
          onRowDoubleClick={handleViewPurchaseOrder}
          emptyMessage={t('common.noResults')}
          enablePagination={true}
          pageSize={20}
        />
      </div>

      {/* Create/Edit/View Modal */}
      {modalState.isOpen && (
        <PurchaseOrderModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          mode={modalState.mode}
          purchaseOrder={modalState.purchaseOrder}
        />
      )}

      {/* Batch Action Confirmation Modal */}
      <Modal
        isOpen={batchActionModalState.isOpen}
        onClose={() =>
          setBatchActionModalState({ isOpen: false, action: '', purchaseOrders: [] })
        }
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {t('common.confirm')}{' '}
              {batchActionModalState.action === 'receive'
                ? t('purchaseOrders.actions.receive')
                : batchActionModalState.action === 'approve'
                ? t('purchaseOrders.actions.approve')
                : batchActionModalState.action === 'submit'
                ? t('purchaseOrders.actions.submit')
                : t('purchaseOrders.actions.cancel')}
            </ModalTitle>
          </ModalHeader>
          <div className="px-6 py-4">
            {batchActionModalState.action === 'receive' && (
              <p>
                {t('purchaseOrders.page.batchReceiveConfirm', { count: String(batchActionModalState.purchaseOrders.length) })}
                <br />
                <strong>{t('purchaseOrders.page.batchReceiveNote')}</strong>
              </p>
            )}
            {batchActionModalState.action === 'approve' && (
              <p>
                {t('purchaseOrders.page.batchApproveConfirm', { count: String(batchActionModalState.purchaseOrders.length) })}
              </p>
            )}
            {batchActionModalState.action === 'submit' && (
              <p>
                {t('purchaseOrders.page.batchSubmitConfirm', { count: String(batchActionModalState.purchaseOrders.length) })}
              </p>
            )}
            {batchActionModalState.action === 'cancel' && (
              <p className="text-destructive">
                {t('purchaseOrders.page.batchCancelConfirm', { count: String(batchActionModalState.purchaseOrders.length) })}
                <br />
                {t('purchaseOrders.page.batchCancelNote')}
              </p>
            )}
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBatchActionModalState({ isOpen: false, action: '', purchaseOrders: [] })
              }
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={confirmBatchAction}
              variant={batchActionModalState.action === 'cancel' ? 'destructive' : 'default'}
            >
              {t('common.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={pdfPreviewState.isOpen}
        onClose={() => setPdfPreviewState({ isOpen: false, orders: [] })}
        orders={pdfPreviewState.orders}
        title={t('purchaseOrders.page.pdfPreviewTitle')}
        getBatchPdfBlob={purchaseOrdersService.getBatchPdfBlob}
        downloadBatchPdf={purchaseOrdersService.downloadBatchPdf}
      />

      {/* Receive PO Modal */}
      {receiveModalState.isOpen && receiveModalState.purchaseOrder && (
        <ReceivePurchaseOrderModal
          key={receiveModalState.purchaseOrder.purchase_order_id}
          isOpen={receiveModalState.isOpen}
          onClose={() => setReceiveModalState({ isOpen: false })}
          purchaseOrder={receiveModalState.purchaseOrder}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false })}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Eliminar orden de compra</ModalTitle>
            <ModalDescription>
              {deleteConfirmState.purchaseOrder && (
                <>
                  Estás por eliminar la OC{' '}
                  <strong>{deleteConfirmState.purchaseOrder.purchase_order_number}</strong>.{' '}
                  {deleteConfirmState.purchaseOrder.status === 'draft'
                    ? 'Esta acción no se puede deshacer.'
                    : 'La orden será cancelada.'}
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmState({ isOpen: false })}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteMutation.isPending}
              className="w-full sm:w-auto"
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
