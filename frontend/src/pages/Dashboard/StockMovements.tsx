import { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Package, Warehouse, Calendar, FileText } from 'lucide-react';
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
  mode: 'create' | 'edit' | 'view';
  movement?: StockMovementWithDetails;
}

const MOVEMENT_TYPE_COLORS = {
  entrada: 'success' as const,
  salida: 'danger' as const,
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
  const openModal = useCallback(
    (mode: 'create' | 'edit' | 'view', movement?: StockMovementWithDetails) => {
      console.log('openModal called with:', { mode, movement }); // Debug
      setModal({ isOpen: true, mode, movement });
    },
    []
  );

  const closeModal = () => {
    console.log('closeModal called'); // Debug
    setModal({ isOpen: false, mode: 'create', movement: undefined });
  };

  const handleCreateClick = () => {
    console.log('handleCreateClick called'); // Debug
    openModal('create');
  };

  const handleEdit = (movement: StockMovementWithDetails) => {
    console.log('handleEdit called with:', movement); // Debug
    openModal('edit', movement);
  };

  const handleDelete = (movement: StockMovementWithDetails) => {
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
      console.log('handleSubmit called with:', { mode: modal.mode, data }); // Debug
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

  // *** CORRECCIÓN FINAL: Usar el patrón correcto para commonEntityActions ***
  const actions: EntityTableAction<StockMovementWithDetails>[] = [
    commonEntityActions.view((movement: StockMovementWithDetails) => {
      openModal('view', movement);
    }),
    commonEntityActions.edit((movement: StockMovementWithDetails) => {
      handleEdit(movement);
    }),
    commonEntityActions.delete((movement: StockMovementWithDetails) => {
      handleDelete(movement);
    }),
  ];

  // Table columns
  const columns = createEntityTableColumns<StockMovementWithDetails>([
    {
      header: 'Tipo',
      accessorKey: 'movement_type',
      cell: (_, row) => {
        const type = row.movement_type;
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
      header: 'Producto',
      accessorKey: 'product',
      cell: (_, row) => {
        const product = row.product;
        return product?.name ? (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-48 truncate">{product.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin producto</span>
        );
      },
    },
    {
      header: 'Almacén',
      accessorKey: 'warehouse',
      cell: (_, row) => {
        const warehouse = row.warehouse;
        return warehouse?.name ? (
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-32 truncate">{warehouse.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin almacén</span>
        );
      },
    },
    {
      header: 'Cantidad',
      accessorKey: 'quantity',
      cell: (_, row) => {
        const quantity = row.quantity;
        const type = row.movement_type;
        const isPositive = type === 'entrada' || type === 'ajuste';

        return (
          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : '-'}
            {Math.abs(quantity || 0)}
          </div>
        );
      },
    },
    {
      header: 'Referencia',
      accessorKey: 'reference',
      cell: (_, row) => {
        const reference = row.reference;
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
      header: 'Fecha',
      accessorKey: 'movement_date',
      cell: (_, row) => {
        const date = row.movement_date;
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
  ], actions);

  const isLoaderVisible =
    createMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  // Debug del estado del modal
  console.log('Modal state:', modal);

  return (
    <>
      <Helmet>
        <title>Movimientos de Stock | AgroPanel</title>
        <meta name="description" content="Gestiona los movimientos de stock de tu inventario" />
      </Helmet>

      <CRUDPage
        title="Movimientos de Stock"
        description="Gestiona entradas, salidas y ajustes de inventario"
        data={movements}
        columns={columns}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
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
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, movement: undefined })}
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
