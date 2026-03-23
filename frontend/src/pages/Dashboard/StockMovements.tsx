import React, { useCallback, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../../contexts/LanguageContext';
import { CRUDPage } from '../../components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '../../components/ui/table-with-bulk-actions';
import { StockMovementModal } from '../../components/features/stock-movements/stock-movement-modal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ToastContainer } from '../../components/ui/toast';
import { ArrowUpCircle, ArrowDownCircle, ArrowUpDown, AlertTriangle, Eye, Edit, Trash, Package, Settings2 } from 'lucide-react';
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
  const { t } = useTranslation();
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
      throw error;
    }
  };

  const isLoaderVisible =
    createMovement.isPending || updateMovement.isPending || deleteMovement.isPending;

  // Bulk actions configuration
  const bulkActions: BulkAction<StockMovementWithDetails>[] = useMemo(() => [{
    key: 'delete',
    label: t('common.delete'),
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (movements) => handleDelete(movements),
    alwaysShow: true,
  }], [t]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'movement_type',
      header: t('stockMovements.page.columnType'),
      cell: ({ row }: any) => {
        const type: string = row.original.movement_type;
        const config: Record<string, { icon: React.ReactNode; badgeClass: string; labelKey: string }> = {
          entry:      { icon: <ArrowUpCircle className="w-5 h-5 text-green-600 mr-2" />,  badgeClass: 'bg-green-50 text-green-700 border-green-200',   labelKey: 'stockMovements.types.entry' },
          exit:       { icon: <ArrowDownCircle className="w-5 h-5 text-red-600 mr-2" />,  badgeClass: 'bg-red-50 text-red-700 border-red-200',         labelKey: 'stockMovements.types.exit' },
          adjustment: { icon: <ArrowUpDown className="w-5 h-5 text-blue-600 mr-2" />,     badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',      labelKey: 'stockMovements.types.adjustment' },
          compliance: { icon: <ArrowUpDown className="w-5 h-5 text-purple-600 mr-2" />,   badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', labelKey: 'stockMovements.types.compliance' },
          production: { icon: <Settings2 className="w-5 h-5 text-orange-600 mr-2" />,     badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', labelKey: 'stockMovements.types.production' },
        };
        const { icon, badgeClass, labelKey } = config[type] ?? config.exit;
        return (
          <div className="flex items-center">
            {icon}
            <Badge variant="outline" className={badgeClass}>
              {t(labelKey as any)}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'product',
      header: t('stockMovements.page.columnProduct'),
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
      header: t('stockMovements.page.columnQuantity'),
      cell: ({ row }: any) => (
        <span className="text-sm font-medium text-gray-900">
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: 'warehouse',
      header: t('stockMovements.page.columnWarehouse'),
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-900">
          {row.original.warehouse?.name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'reference',
      header: t('stockMovements.page.columnReference'),
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-500">
          {row.original.reference || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: t('stockMovements.page.columnDate'),
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-900">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('stockMovements.page.columnActions'),
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('view', row.original)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete([row.original])}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [t]);

  return (
    <>
      <Helmet>
        <title>{t('stockMovements.page.title')} - Betali</title>
      </Helmet>

      <CRUDPage
        title={t('stockMovements.page.title')}
        description={t('stockMovements.page.description')}
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
            createButtonLabel={t('stockMovements.page.newMovement')}
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(movement) => openModal('edit', movement)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage={
              !currentOrganization
                ? t('stockMovements.page.noOrgMessage')
                : t('stockMovements.page.emptyMessage')
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
            <ModalTitle>{t('stockMovements.page.deleteTitle')}</ModalTitle>
            <ModalDescription>
              {deleteModal.movements.length === 1 ? (
                <span dangerouslySetInnerHTML={{ __html: t('stockMovements.page.deleteSingle') }} />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: t('stockMovements.page.deleteMultiple', { count: String(deleteModal.movements.length) }) }} />
              )}
              {' '}{t('stockMovements.page.deleteCannotUndo')}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, movements: [] })}
              disabled={deleteMovement.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteMovement.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
