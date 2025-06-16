import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Warehouse,
  MapPin,
  Activity,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Package,
  Power,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import { Database } from '../../types/database';
import { WarehouseModal } from '../../components/modules/warehouse/warehouseModal';
import {
  useWarehouseManagement,
  useDeactivateWarehouse,
  useDeleteWarehouse,
  useUpdateWarehouse,
} from '../../hooks/useWarehouse';

type WarehouseType = Database['public']['Tables']['warehouse']['Row'];

interface WarehouseWithStats extends WarehouseType {
  stats: {
    totalMovements: number;
    recentMovements: Array<{
      movement_id: string;
      movement_date: string;
      movement_type: string;
      quantity: number;
      products?: {
        name: string;
      };
    }>;
  };
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  warehouse?: WarehouseWithStats;
}

const WarehousesPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    warehouse?: WarehouseWithStats;
  }>({ show: false });

  const { warehouses, isLoading, error, isAnyMutationLoading } = useWarehouseManagement();

  const deactivateWarehouse = useDeactivateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const openModal = (mode: ModalState['mode'], warehouse?: WarehouseWithStats) => {
    setModal({
      isOpen: true,
      mode,
      warehouse,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      mode: 'create',
      warehouse: undefined,
    });
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleToggleActive = async (e: React.MouseEvent, warehouse: WarehouseWithStats) => {
    e.preventDefault();
    e.stopPropagation();

    const action = warehouse.is_active ? 'desactivar' : 'activar';

    if (window.confirm(`¿Está seguro de que desea ${action} el almacén "${warehouse.name}"?`)) {
      try {
        if (warehouse.is_active) {
          await deactivateWarehouse.mutateAsync(warehouse.warehouse_id);
        } else {
          await updateWarehouse.mutateAsync({
            id: warehouse.warehouse_id,
            data: {
              name: warehouse.name,
              location: warehouse.location,
              is_active: true,
            },
          });
        }
      } catch (error) {
        console.error(`Error al ${action} almacén:`, error);
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, warehouse: WarehouseWithStats) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm({ show: true, warehouse });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.warehouse) {
      try {
        await deleteWarehouse.mutateAsync(showDeleteConfirm.warehouse.warehouse_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error al eliminar almacén:', error);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm({ show: false });
  };

  const columns: ColumnDef<WarehouseWithStats>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center">
          <Warehouse className="h-4 w-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Ubicación',
      cell: ({ row }) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-700">{row.original.location}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.is_active ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <Power className="h-3 w-3 mr-1" />
              Inactivo
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'stats.totalMovements',
      header: 'Movimientos',
      cell: ({ row }) => (
        <div className="flex items-center">
          <Package className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-700">{row.original.stats?.totalMovements || 0}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const warehouse = row.original;

        return (
          <div className="flex items-center space-x-1">
            {/* Botón Ver */}
            <Button
              variant="ghost"
              size="sm"
              onClick={e => handleActionClick(e, () => openModal('view', warehouse))}
              className="h-8 w-8 p-0 hover:bg-blue-50"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={e => handleActionClick(e, () => openModal('edit', warehouse))}
              className="h-8 w-8 p-0 hover:bg-yellow-50"
              title="Editar almacén"
            >
              <Edit className="h-4 w-4 text-yellow-600" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={e => handleToggleActive(e, warehouse)}
              className="h-8 w-8 p-0 hover:bg-purple-50"
              title={warehouse.is_active ? 'Desactivar' : 'Activar'}
              disabled={isAnyMutationLoading}
            >
              {warehouse.is_active ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={e => handleDeleteClick(e, warehouse)}
              className="h-8 w-8 p-0 hover:bg-red-50"
              title="Eliminar almacén"
              disabled={isAnyMutationLoading}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar almacenes</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Almacenes | SaaS Gestión de Stock</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Gestión de Almacenes
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Administra y controla todos los almacenes de tu organización
              </p>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Button onClick={() => openModal('create')} className="inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Almacén
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={warehouses || []}
            loading={isLoading}
            onRowClick={warehouse => openModal('view', warehouse)}
            emptyMessage="No se encontraron almacenes"
            className="cursor-pointer"
          />
        </div>

        <WarehouseModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          warehouse={modal.warehouse}
          mode={modal.mode}
        />

        {showDeleteConfirm.show && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3 className="text-base font-semibold leading-6 text-gray-900">
                        Eliminar Almacén
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          ¿Está seguro de que desea eliminar permanentemente el almacén "
                          <span className="font-medium">{showDeleteConfirm.warehouse?.name}</span>
                          "? Esta acción no se puede deshacer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deleteWarehouse.isPending}
                    className="ml-3"
                  >
                    {deleteWarehouse.isPending ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={cancelDelete}
                    disabled={deleteWarehouse.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </DashboardLayout>
    </>
  );
};

export default WarehousesPage;
