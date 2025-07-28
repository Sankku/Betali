import { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CRUDPage } from '../../components/templates/crud-page';
import { BackendConfiguredTable } from '../../components/table/BackendConfiguredTable';
import { useTableConfig } from '../../hooks/useTableConfig';
import { StockMovementModal } from '../../components/features/stock-movements/stock-movement-modal';
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

  // Use the new table configuration system
  const {
    data: tableConfig,
    isLoading: configLoading,
    error: configError,
  } = useTableConfig('stock_movements');
  const { data: movements = [], isLoading, error } = useStockMovements();
  const createMovement = useCreateStockMovement();
  const updateMovement = useUpdateStockMovement();
  const deleteMovement = useDeleteStockMovement();

  const openModal = useCallback(
    (mode: 'create' | 'edit' | 'view', movement?: StockMovementWithDetails) => {
      setModal({ isOpen: true, mode, movement });
    },
    []
  );

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', movement: undefined });
  };

  const handleCreateClick = () => {
    openModal('create');
  };

  const handleEdit = (movement: StockMovementWithDetails) => {
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
        console.error('Error deleting movement:', error);
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
      console.error('Error saving movement:', error);
    }
  };

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: StockMovementWithDetails) => {
    switch (action) {
      case 'view':
        openModal('view', row);
        break;
      case 'edit':
        handleEdit(row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      case 'create':
        openModal('create');
        break;
      case 'revert':
        // Handle revert action if needed
        console.log('Revert action not implemented yet', row);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const isLoaderVisible =
    createMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  return (
    <>
      <Helmet>
        <title>Stock Movements | AgroPanel</title>
        <meta name="description" content="Manage inventory movements and adjustments" />
      </Helmet>

      <CRUDPage
        title={(tableConfig as any)?.name || 'Stock Movements'}
        description={
          configLoading
            ? 'Loading table configuration...'
            : 'Manage inventory entries, exits, and adjustments'
        }
        data={movements}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig as any}
              data={movements}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          ) : null
        }
      />
      <StockMovementModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        mode={modal.mode}
        initialData={modal.movement}
        isLoading={createMovement.isPending || updateMovement.isPending}
      />

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, movement: undefined })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Movement</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete this stock movement? This action cannot be
              undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, movement: undefined })}
              disabled={deleteMovement.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMovement.isPending}
            >
              {deleteMovement.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
