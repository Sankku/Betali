import { useCallback, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { CRUDPage } from '../../components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '../../components/ui/table-with-bulk-actions';
import { StockMovementModal } from '../../components/features/stock-movements/stock-movement-modal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ToastContainer } from '../../components/ui/toast';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, Eye, Edit, Trash, Package } from 'lucide-react';
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
import { useOrganization } from '../../context/OrganizationContext';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  movement?: StockMovementWithDetails;
}

export default function StockMovementsPage() {
  const { currentOrganization } = useOrganization();
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    movement: undefined,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    movements: StockMovementWithDetails[];
  }>({ isOpen: false, movements: [] });

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

  const handleDelete = (movements: StockMovementWithDetails[]) => {
    if (!movements || movements.length === 0) {
      console.error('No movements selected');
      return;
    }
    setDeleteModal({ isOpen: true, movements });
  };

  const confirmDelete = async () => {
    if (deleteModal.movements.length > 0) {
      try {
        for (const movement of deleteModal.movements) {
          if (movement.movement_id) {
            await deleteMovement.mutateAsync(movement.movement_id);
          }
        }
        setDeleteModal({ isOpen: false, movements: [] });
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

  const isLoaderVisible =
    createMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  // Bulk actions configuration
  const bulkActions: BulkAction<StockMovementWithDetails>[] = useMemo(() => [{
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (movements) => handleDelete(movements),
    alwaysShow: true,
  }], []);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row }: any) => {
        const isEntry = row.original.movement_type === 'entry';
        return (
          <div className="flex items-center">
            {isEntry ? (
              <ArrowUpCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <Badge
              variant="outline"
              className={isEntry ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
            >
              {isEntry ? 'Entry' : 'Exit'}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'product',
      header: 'Product',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <Package className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-900">
            {row.original.product?.name || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }: any) => (
        <span className="text-sm font-medium text-gray-900">
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-900">
          {row.original.warehouse?.name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-500">
          {row.original.reference || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-900">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('view', row.original)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete([row.original])}
            className="text-danger-600 hover:text-danger-800"
          >
            <Trash className="w-4 h-4 text-danger-600" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <>
      <Helmet>
        <title>Stock Movements | AgroPanel</title>
        <meta name="description" content="Manage inventory movements and adjustments" />
      </Helmet>

      <CRUDPage
        title="Stock Movements"
        description="Manage inventory entries, exits, and adjustments"
        data={movements}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
        customTable={
          <TableWithBulkActions
            data={movements}
            columns={columns}
            loading={isLoading}
            getRowId={(movement: StockMovementWithDetails) => movement.movement_id}
            bulkActions={bulkActions}
            createButtonLabel="New Movement"
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(movement) => openModal('edit', movement)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage={
              !currentOrganization
                ? "Please select or create an organization to access stock movement features."
                : "No stock movements recorded yet. Create your first movement to get started!"
            }
          />
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
        onClose={() => setDeleteModal({ isOpen: false, movements: [] })}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Delete Movement</ModalTitle>
            <ModalDescription>
              {deleteModal.movements.length === 1 ? (
                <>
                  Are you sure you want to delete this stock movement?
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteModal.movements.length}</strong> stock movements?
                </>
              )}
              {' '}This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, movements: [] })}
              disabled={deleteMovement.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteMovement.isPending}
              className="w-full sm:w-auto"
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
