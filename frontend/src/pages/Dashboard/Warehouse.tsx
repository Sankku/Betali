import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Warehouse, MapPin, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import {
  createEntityTableColumns,
  commonEntityActions,
  EntityTableAction,
} from '../../components/templates/entity-table';
import {
  WarehouseModal,
  WarehouseWithStats,
  WarehouseFormData,
} from '../../components/features/warehouse';
import { Badge } from '../../components/ui/badge';
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
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  const { warehouses, isLoading, error, isAnyMutationLoading } = useWarehouseManagement();
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
        data: { is_active: !warehouse.is_active }
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
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
      console.error('Error al guardar:', error);
    }
  };

  const getSafeId = (warehouse: WarehouseWithStats): string => {
    if (!warehouse?.warehouse_id) return 'N/A';
    const id = String(warehouse.warehouse_id);
    return id.length > 8 ? id.slice(0, 8) : id;
  };

  const getSafeValue = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  };

  const tableColumns: any[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: (value: any, warehouse: WarehouseWithStats) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Warehouse className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-neutral-900">{getSafeValue(value, 'Sin nombre')}</div>
            <div className="text-sm text-neutral-500">ID: {getSafeId(warehouse)}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Ubicación',
      cell: (value: any) => (
        <div className="flex items-center text-neutral-600">
          <MapPin className="w-4 h-4 mr-2" />
          {getSafeValue(value, 'Sin ubicación')}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: (value: any, warehouse: WarehouseWithStats) => {
        if (!warehouse) {
          return (
            <div className="flex items-center space-x-2">
              <Badge variant="danger">Error</Badge>
            </div>
          );
        }

        const isActive = Boolean(value);

        return (
          <div className="flex items-center space-x-2">
            <Badge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={e => {
                e.stopPropagation();
                handleToggleActive(warehouse);
              }}
              disabled={deactivateWarehouse.isPending}
              className="hover:bg-neutral-100"
            >
              {isActive ? (
                <ToggleRight className="w-4 h-4 text-green-600" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-neutral-400" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'stats',
      header: 'Movimientos',
      cell: (value: any) => {
        const totalMovements = value?.totalMovements ?? 0;

        return (
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900">{totalMovements}</div>
            <div className="text-xs text-neutral-500">Total</div>
          </div>
        );
      },
    },
  ];

  const tableActions: EntityTableAction<WarehouseWithStats>[] = [
    commonEntityActions.view((warehouse: WarehouseWithStats) => {
      openModal('view', warehouse);
    }),
    commonEntityActions.edit((warehouse: WarehouseWithStats) => {
      openModal('edit', warehouse);
    }),
    commonEntityActions.delete((warehouse: WarehouseWithStats) => {
      handleDelete(warehouse);
    }),
  ];

  const columns = createEntityTableColumns(tableColumns, tableActions);

  React.useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      console.log('Warehouse data structure:', warehouses[0]);
    }
  }, [warehouses]);

  return (
    <>
      <Helmet>
        <title>Almacenes - Dashboard</title>
      </Helmet>

      <CRUDPage
        title="Gestión de Almacenes"
        description="Administre los almacenes y su configuración"
        data={warehouses || []}
        isLoading={isLoading}
        error={error}
        columns={columns}
        onCreateClick={handleCreateClick}
        onRowClick={(warehouse: WarehouseWithStats) => openModal('view', warehouse)}
        isAnyMutationLoading={isAnyMutationLoading}
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
            <ModalTitle>¿Eliminar almacén?</ModalTitle>
            <ModalDescription>
              Esta acción no se puede deshacer. El almacén{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.warehouse?.name || 'seleccionado'}"
              </span>{' '}
              será eliminado permanentemente.
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteWarehouse.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteWarehouse.isPending}
              className="w-full sm:w-auto"
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default WarehousesPage;
