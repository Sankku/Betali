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
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Using plain HTML table elements - no table component needed
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@/components/ui/modal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { formatDate } from '@/lib/utils';
import {
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
  useApprovePurchaseOrder,
  useSubmitPurchaseOrder,
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

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  purchaseOrder?: PurchaseOrder;
}

export function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    action: 'receive' | 'approve' | 'submit' | 'cancel' | '';
    purchaseOrder?: PurchaseOrder;
  }>({
    isOpen: false,
    action: '',
  });

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
  const { data: suppliers = [] } = useSuppliers({ searchOptions: { active_only: true } });
  const { data: warehouses } = useWarehouses();
  const updateStatusMutation = useUpdatePurchaseOrderStatus();
  const cancelMutation = useCancelPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();

  // Handlers
  const handleCreatePurchaseOrder = useCallback(() => {
    setModalState({ isOpen: false, mode: 'create' });
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

  // Action handlers
  const handleReceive = useCallback((purchaseOrder: PurchaseOrder) => {
    setActionModalState({ isOpen: true, action: 'receive', purchaseOrder });
  }, []);

  const handleApprove = useCallback((purchaseOrder: PurchaseOrder) => {
    setActionModalState({ isOpen: true, action: 'approve', purchaseOrder });
  }, []);

  const handleSubmit = useCallback((purchaseOrder: PurchaseOrder) => {
    setActionModalState({ isOpen: true, action: 'submit', purchaseOrder });
  }, []);

  const handleCancel = useCallback((purchaseOrder: PurchaseOrder) => {
    setActionModalState({ isOpen: true, action: 'cancel', purchaseOrder });
  }, []);

  const confirmAction = useCallback(async () => {
    const { action, purchaseOrder } = actionModalState;
    if (!action || !purchaseOrder) return;

    try {
      switch (action) {
        case 'receive':
          await receiveMutation.mutateAsync(purchaseOrder.purchase_order_id);
          break;
        case 'approve':
          await approveMutation.mutateAsync(purchaseOrder.purchase_order_id);
          break;
        case 'submit':
          await submitMutation.mutateAsync(purchaseOrder.purchase_order_id);
          break;
        case 'cancel':
          await cancelMutation.mutateAsync(purchaseOrder.purchase_order_id);
          break;
      }

      setActionModalState({ isOpen: false, action: '', purchaseOrder: undefined });
    } catch (error) {
      // Error handled by mutation hooks
    }
  }, [actionModalState, receiveMutation, approveMutation, submitMutation, cancelMutation]);

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

  /**
   * Get available actions for a purchase order
   */
  const getAvailableActions = (purchaseOrder: PurchaseOrder) => {
    const actions = [];
    const availableTransitions = getAvailableStatusTransitions(purchaseOrder.status);

    if (availableTransitions.includes('pending')) {
      actions.push({ key: 'submit', label: 'Enviar', handler: () => handleSubmit(purchaseOrder) });
    }

    if (availableTransitions.includes('approved')) {
      actions.push({
        key: 'approve',
        label: 'Aprobar',
        handler: () => handleApprove(purchaseOrder),
      });
    }

    if (availableTransitions.includes('received')) {
      actions.push({
        key: 'receive',
        label: 'Recibir',
        handler: () => handleReceive(purchaseOrder),
      });
    }

    if (availableTransitions.includes('cancelled')) {
      actions.push({
        key: 'cancel',
        label: 'Cancelar',
        handler: () => handleCancel(purchaseOrder),
      });
    }

    return actions;
  };

  return (
    <>
      <Helmet>
        <title>Órdenes de Compra - Betali</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
            <p className="text-muted-foreground mt-1">Gestiona las compras a proveedores</p>
          </div>
          <Button onClick={handleCreatePurchaseOrder}>
            <Package className="h-4 w-4 mr-2" />
            Nueva Orden de Compra
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  {PURCHASE_ORDER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Supplier Filter */}
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Proveedores</SelectItem>
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
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Almacenes</SelectItem>
                  {warehouses?.data?.map((warehouse) => (
                    <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Número</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Proveedor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Almacén</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Entrega Esperada</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Cargando...
                      </td>
                    </tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron órdenes de compra
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((purchaseOrder) => (
                      <tr key={purchaseOrder.purchase_order_id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">
                          {purchaseOrder.purchase_order_number}
                        </td>
                        <td className="px-4 py-3">
                          {purchaseOrder.suppliers?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {purchaseOrder.warehouse?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3">{formatDate(purchaseOrder.order_date)}</td>
                        <td className="px-4 py-3">
                          {purchaseOrder.expected_delivery_date
                            ? formatDate(purchaseOrder.expected_delivery_date)
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(purchaseOrder.status) as any}>
                            {STATUS_LABELS[purchaseOrder.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${purchaseOrder.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewPurchaseOrder(purchaseOrder)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {purchaseOrder.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPurchaseOrder(purchaseOrder)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}

                            {getAvailableActions(purchaseOrder).map((action) => (
                              <Button
                                key={action.key}
                                variant="outline"
                                size="sm"
                                onClick={action.handler}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModalState.isOpen}
        onClose={() => setActionModalState({ isOpen: false, action: '', purchaseOrder: undefined })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              Confirmar{' '}
              {actionModalState.action === 'receive'
                ? 'Recepción'
                : actionModalState.action === 'approve'
                ? 'Aprobación'
                : actionModalState.action === 'submit'
                ? 'Envío'
                : 'Cancelación'}
            </ModalTitle>
          </ModalHeader>
          <div className="py-4">
            {actionModalState.action === 'receive' && (
              <p>
                ¿Está seguro de marcar la orden de compra "
                {actionModalState.purchaseOrder?.purchase_order_number}" como recibida?
                <br />
                <strong>Esto creará movimientos de stock de entrada automáticamente.</strong>
              </p>
            )}
            {actionModalState.action === 'approve' && (
              <p>
                ¿Está seguro de aprobar la orden de compra "
                {actionModalState.purchaseOrder?.purchase_order_number}"?
              </p>
            )}
            {actionModalState.action === 'submit' && (
              <p>
                ¿Está seguro de enviar la orden de compra "
                {actionModalState.purchaseOrder?.purchase_order_number}" para aprobación?
              </p>
            )}
            {actionModalState.action === 'cancel' && (
              <p className="text-destructive">
                ¿Está seguro de cancelar la orden de compra "
                {actionModalState.purchaseOrder?.purchase_order_number}"?
                <br />
                Esta acción no se puede deshacer.
              </p>
            )}
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionModalState({ isOpen: false, action: '', purchaseOrder: undefined })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              variant={actionModalState.action === 'cancel' ? 'destructive' : 'default'}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
