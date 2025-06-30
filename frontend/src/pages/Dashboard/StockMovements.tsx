import React, { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowUpDown, Package, Warehouse, Calendar, FileText } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import {
  createEntityTableColumns,
  commonEntityActions,
  EntityTableAction,
} from '../../components/templates/entity-table';
import { StockMovementModal } from '../../components/features/stock-movements/stock-movement-modal';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import {
  useStockMovements,
  useCreateStockMovement,
  useUpdateStockMovement,
  useDeleteStockMovement,
} from '../../hooks/useStockMovement';
import {
  StockMovementWithDetails,
  StockMovementFormData,
} from '../../services/api/stockMovementService';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '../../components/ui';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  movement?: StockMovementWithDetails;
}

const MOVEMENT_TYPE_COLORS = {
  entrada: 'success' as const,
  salida: 'destructive' as const,
  ajuste: 'warning' as const,
  transferencia: 'default' as const,
};

const MOVEMENT_TYPE_LABELS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  transferencia: 'Transferencia',
};

export default function StockMovementsPage() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    movement: undefined,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    movement?: StockMovementWithDetails;
  }>({ isOpen: false, movement: undefined });

  // Hooks
  const { data: movements = [], isLoading, error } = useStockMovements();
  const createMovement = useCreateStockMovement();
  const updateMovement = useUpdateStockMovement();
  const deleteMovement = useDeleteStockMovement();

  // Modal handlers
  const openModal = useCallback((mode: 'create' | 'edit', movement?: StockMovementWithDetails) => {
    setModal({ isOpen: true, mode, movement });
  }, []);

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', movement: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleEdit = async (movement: StockMovementWithDetails) => {
    openModal('edit', movement);
  };

  const handleDelete = async (movement: StockMovementWithDetails) => {
    if (!movement?.movement_id) {
      console.error('Movement ID is missing:', movement);
      return;
    }
    setDeleteModal({ isOpen: true, movement });
  };

  const confirmDelete = async () => {
    if (deleteModal.movement?.movement_id) {
      try {
        await deleteMovement.mutateAsync(deleteModal.movement.movement_id);
        setDeleteModal({ isOpen: false, movement: undefined });
      } catch (error) {
        console.error('Error al eliminar movimiento:', error);
      }
    }
  };

  const handleSubmit = async (data: StockMovementFormData) => {
    try {
      if (modal.mode === 'create') {
        await createMovement.mutateAsync(data);
      } else if (modal.movement?.movement_id) {
        await updateMovement.mutateAsync({
          id: modal.movement.movement_id,
          data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
    }
  };

  // Table columns
  const columns = createEntityTableColumns<StockMovementWithDetails>([
    {
      id: 'movement_type',
      header: 'Tipo',
      accessorKey: 'movement_type',
      cell: ({ row }) => {
        const type = row.original.movement_type;
        return (
          <Badge
            variant={MOVEMENT_TYPE_COLORS[type as keyof typeof MOVEMENT_TYPE_COLORS] || 'default'}
          >
            {MOVEMENT_TYPE_LABELS[type as keyof typeof MOVEMENT_TYPE_LABELS] || type}
          </Badge>
        );
      },
    },
    {
      id: 'product',
      header: 'Producto',
      cell: ({ row }) => {
        const product = row.original.product;
        return (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{product?.name || 'Sin producto'}</span>
          </div>
        );
      },
    },
    {
      id: 'warehouse',
      header: 'Almacén',
      cell: ({ row }) => {
        const warehouse = row.original.warehouse;
        return (
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <span>{warehouse?.name || 'Sin almacén'}</span>
          </div>
        );
      },
    },
    {
      id: 'quantity',
      header: 'Cantidad',
      accessorKey: 'quantity',
      cell: ({ row }) => (
        <div className="text-right font-medium">{row.original.quantity.toLocaleString()}</div>
      ),
    },
    {
      id: 'reference',
      header: 'Referencia',
      accessorKey: 'reference',
      cell: ({ row }) => {
        const reference = row.original.reference;
        return reference ? (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-32 truncate">{reference}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin referencia</span>
        );
      },
    },
    {
      id: 'movement_date',
      header: 'Fecha',
      accessorKey: 'movement_date',
      cell: ({ row }) => {
        const date = row.original.movement_date;
        return date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin fecha</span>
        );
      },
    },
  ]);

  // Table actions
  const actions: EntityTableAction<StockMovementWithDetails>[] = [
    ...commonEntityActions<StockMovementWithDetails>({
      onEdit: handleEdit,
      onDelete: handleDelete,
      getEntityId: movement => movement.movement_id,
      getEntityName: movement =>
        `${MOVEMENT_TYPE_LABELS[movement.movement_type as keyof typeof MOVEMENT_TYPE_LABELS] || movement.movement_type} - ${movement.product?.name || 'Sin producto'}`,
    }),
  ];

  const isLoaderVisible =
    createMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  return (
    <>
      <Helmet>
        <title>Movimientos de Stock | AgroPanel</title>
        <meta name="description" content="Gestiona los movimientos de stock de tu inventario" />
      </Helmet>

      <CRUDPage
        title="Movimientos de Stock"
        description="Gestiona entradas, salidas y ajustes de inventario"
        icon={ArrowUpDown}
        data={movements}
        columns={columns}
        actions={actions}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
        createButtonText="Nuevo Movimiento"
        emptyStateTitle="No hay movimientos registrados"
        emptyStateDescription="Comienza registrando tu primer movimiento de stock"
        searchPlaceholder="Buscar movimientos..."
        getSearchableText={movement =>
          `${movement.movement_type} ${movement.product?.name || ''} ${movement.warehouse?.name || ''} ${movement.reference || ''}`
        }
      />

      {/* Create/Edit Modal */}
      <StockMovementModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        mode={modal.mode}
        initialData={modal.movement}
        isLoading={createMovement.isPending || updateMovement.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal.isOpen}
        onOpenChange={open => !open && setDeleteModal({ isOpen: false, movement: undefined })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Eliminar Movimiento</ModalTitle>
            <ModalDescription>
              ¿Estás seguro de que deseas eliminar este movimiento de stock? Esta acción no se puede
              deshacer.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, movement: undefined })}
              disabled={deleteMovement.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMovement.isPending}
            >
              {deleteMovement.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
