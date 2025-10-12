import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Building2, MapPin, Eye, Edit, Trash, ToggleLeft, ToggleRight } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '../../components/ui/table-with-bulk-actions';
import {
  WarehouseModal,
  WarehouseWithStats,
  WarehouseFormData,
} from '../../components/features/warehouse';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '../../components/ui/modal';
import { ToastContainer } from '../../components/ui/toast';
import {
  useWarehouseManagement,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeactivateWarehouse,
  useDeleteWarehouse,
} from '../../hooks/useWarehouse';
import { useOrganization } from '../../context/OrganizationContext';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  warehouse?: WarehouseWithStats;
}

interface DeleteConfirmState {
  show: boolean;
  warehouses: WarehouseWithStats[];
}

const WarehousesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    warehouses: [],
  });

  const { warehouses, isLoading, error } = useWarehouseManagement();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deactivateWarehouse = useDeactivateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const openModal = (mode: ModalState['mode'], warehouse?: WarehouseWithStats) => {
    setModal({ isOpen: true, mode, warehouse });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', warehouse: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleToggleActive = async (warehouse: WarehouseWithStats) => {
    try {
      await updateWarehouse.mutateAsync({
        id: warehouse.warehouse_id,
        data: { is_active: !warehouse.is_active },
      });
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleDelete = async (warehouses: WarehouseWithStats[]) => {
    if (!warehouses || warehouses.length === 0) {
      console.error('No warehouses selected');
      return;
    }
    setShowDeleteConfirm({ show: true, warehouses });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.warehouses.length > 0) {
      try {
        for (const warehouse of showDeleteConfirm.warehouses) {
          if (warehouse.warehouse_id) {
            await deleteWarehouse.mutateAsync(warehouse.warehouse_id);
          }
        }
        setShowDeleteConfirm({ show: false, warehouses: [] });
      } catch (error) {
        console.error('Error while deleting:', error);
      }
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ show: false, warehouses: [] });
  };

  const handleSubmit = async (data: WarehouseFormData) => {
    try {
      if (modal.mode === 'create') {
        await createWarehouse.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.warehouse?.warehouse_id) {
        await updateWarehouse.mutateAsync({
          id: modal.warehouse.warehouse_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const isLoaderVisible =
    createWarehouse.isPending || updateWarehouse.isPending || deleteWarehouse.isPending || deactivateWarehouse.isPending;

  // Bulk actions configuration
  const bulkActions: BulkAction<WarehouseWithStats>[] = useMemo(() => [{
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (warehouses) => handleDelete(warehouses),
    alwaysShow: true,
  }], []);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Warehouse',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.name}</div>
            {row.original.code && (
              <div className="text-sm text-gray-500">Code: {row.original.code}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }: any) => (
        row.original.location ? (
          <div className="flex items-center text-sm text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            {row.original.location}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge
          variant={row.original.is_active ? "default" : "secondary"}
          className={row.original.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
            onClick={() => openModal('edit', row.original)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row.original)}
            className={row.original.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
          >
            {row.original.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete([row.original])}
            className="text-red-600 hover:text-red-900"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], []);


  return (
    <>
      <Helmet>
        <title>Warehouses - Dashboard</title>
      </Helmet>

      <CRUDPage
        title="Warehouse Management"
        description="Manage warehouses and their configuration"
        data={warehouses || []}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
        customTable={
          <TableWithBulkActions
            data={warehouses || []}
            columns={columns}
            loading={isLoading}
            getRowId={(warehouse: WarehouseWithStats) => warehouse.warehouse_id}
            bulkActions={bulkActions}
            createButtonLabel="New Warehouse"
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(warehouse) => openModal('edit', warehouse)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage={
              !currentOrganization
                ? "Please select or create an organization to access warehouse management features."
                : "No warehouses created yet. Create your first warehouse to get started!"
            }
          />
        }
      />

      <WarehouseModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        warehouse={modal.warehouse}
        onSubmit={handleSubmit}
        isLoading={createWarehouse.isPending || updateWarehouse.isPending}
      />

      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Delete warehouse?</ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.warehouses.length === 1 ? (
                <>
                  This action cannot be undone. The warehouse{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.warehouses[0]?.name || 'selected'}"
                  </span>{' '}
                  will be permanently deleted.
                </>
              ) : (
                <>
                  This action will permanently delete <strong>{showDeleteConfirm.warehouses.length}</strong> warehouses.
                  This action cannot be undone.
                </>
              )}
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteWarehouse.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteWarehouse.isPending}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default WarehousesPage;
