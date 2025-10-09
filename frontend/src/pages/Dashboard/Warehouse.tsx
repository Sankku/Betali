import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Building2 } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import { BackendConfiguredTable } from '../../components/table/BackendConfiguredTable';
import { useTableConfig } from '../../hooks/useTableConfig';
import {
  WarehouseModal,
  WarehouseWithStats,
  WarehouseFormData,
} from '../../components/features/warehouse';
import { Button } from '../../components/ui/button';
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
  warehouse?: WarehouseWithStats;
}

const WarehousesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  // Use the new table configuration system
  const {
    data: tableConfig,
    isLoading: configLoading,
    error: configError,
  } = useTableConfig('warehouse');
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

  const handleDelete = async (warehouse: WarehouseWithStats) => {
    if (!warehouse?.warehouse_id) {
      console.error('Warehouse ID is missing:', warehouse);
      return;
    }
    setShowDeleteConfirm({ show: true, warehouse });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.warehouse?.warehouse_id) {
      try {
        await deleteWarehouse.mutateAsync(showDeleteConfirm.warehouse.warehouse_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error while deleting:', error);
      }
    } else {
      console.error('Cannot delete: Warehouse ID is missing');
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ show: false });
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

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: WarehouseWithStats) => {
    switch (action) {
      case 'view':
        openModal('view', row);
        break;
      case 'edit':
        openModal('edit', row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      case 'toggle':
        handleToggleActive(row);
        break;
      case 'create':
        openModal('create');
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const isLoaderVisible =
    createWarehouse.isPending || updateWarehouse.isPending || deleteWarehouse.isPending || deactivateWarehouse.isPending;

  React.useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      console.log('Warehouse data structure:', warehouses[0]);
    }
  }, [warehouses]);


  return (
    <>
      <Helmet>
        <title>Warehouses - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={(tableConfig as any)?.name || 'Warehouse Management'}
        description={
          configLoading
            ? 'Loading table configuration...'
            : 'Manage warehouses and their configuration'
        }
        data={warehouses || []}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig as any}
              data={warehouses || []}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
              emptyMessage={
                !currentOrganization 
                  ? "Please select or create an organization to access warehouse management features." 
                  : "No warehouses created yet. Create your first warehouse to get started!"
              }
            />
          ) : null
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
              This action cannot be undone. The warehouse{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.warehouse?.name || 'selected'}"
              </span>{' '}
              will be permanently deleted.
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
