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
      await deactivateWarehouse.mutateAsync({
        id: warehouse.id,
        is_active: !warehouse.is_active,
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleDelete = async (warehouse: WarehouseWithStats) => {
    setShowDeleteConfirm({ show: true, warehouse });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.warehouse) {
      try {
        await deleteWarehouse.mutateAsync(showDeleteConfirm.warehouse.id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const handleSubmit = async (data: WarehouseFormData) => {
    try {
      if (modal.mode === 'create') {
        await createWarehouse.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.warehouse) {
        await updateWarehouse.mutateAsync({
          id: modal.warehouse.id,
          ...data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const getSafeId = (warehouse: WarehouseWithStats): string => {
    if (!warehouse?.id) return 'N/A';
    const id = String(warehouse.id);
    return id.length > 8 ? id.slice(0, 8) : id;
  };

  const getSafeValue = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  };

  const tableColumns = [
    {
      accessorKey: 'name' as keyof WarehouseWithStats,
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
      accessorKey: 'location' as keyof WarehouseWithStats,
      header: 'Ubicación',
      cell: (value: any) => (
        <div className="flex items-center text-neutral-600">
          <MapPin className="w-4 h-4 mr-2" />
          {getSafeValue(value, 'Sin ubicación')}
        </div>
      ),
    },
    {
      accessorKey: 'is_active' as keyof WarehouseWithStats,
      header: 'Estado',
      cell: (value: any, warehouse: WarehouseWithStats) => {
        // Validar que warehouse existe
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
      accessorKey: 'stats' as keyof WarehouseWithStats,
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
    commonEntityActions.view(warehouse => openModal('view', warehouse)),
    commonEntityActions.edit(warehouse => openModal('edit', warehouse)),
    commonEntityActions.delete(handleDelete),
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
        onRowClick={warehouse => openModal('view', warehouse)}
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

      {showDeleteConfirm.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>

              <h3 className="text-lg font-medium text-center mb-2">¿Eliminar almacén?</h3>

              <p className="text-sm text-neutral-600 text-center mb-6">
                Esta acción no se puede deshacer. El almacén{' '}
                <strong>{showDeleteConfirm.warehouse?.name || 'seleccionado'}</strong> será
                eliminado permanentemente.
              </p>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm({ show: false })}
                  className="flex-1"
                  disabled={deleteWarehouse.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="flex-1"
                  loading={deleteWarehouse.isPending}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
};

export default WarehousesPage;
