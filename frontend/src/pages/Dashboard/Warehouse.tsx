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

  const handleToggleActive = async (warehouse: WarehouseWithStats) => {
    const action = warehouse.is_active ? 'desactivar' : 'activar';
    const confirmed = window.confirm(
      `¿Estás seguro que deseas ${action} el almacén "${warehouse.name}"?`
    );

    if (confirmed) {
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

  const handlePermanentDelete = async (warehouseId: string, warehouseName: string) => {
    const confirmed = window.confirm(
      `⚠️ ATENCIÓN: ¿Estás seguro que deseas ELIMINAR PERMANENTEMENTE el almacén "${warehouseName}"?\n\nEsta acción NO se puede deshacer y se perderán todos los datos asociados.`
    );

    if (confirmed) {
      const doubleConfirm = window.confirm(
        `Por favor, confirma una vez más que deseas eliminar permanentemente "${warehouseName}".\n\nEscribe "ELIMINAR" para confirmar.`
      );

      if (doubleConfirm) {
        try {
          await deleteWarehouse.mutateAsync(warehouseId);
        } catch (error) {
          console.error('Error al eliminar almacén permanentemente:', error);
        }
      }
    }
  };

  const columns: ColumnDef<WarehouseWithStats>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Warehouse className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Ubicación',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{row.getValue('location')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isActive ? (
              <>
                <ToggleRight className="w-3 h-3 mr-1" />
                Activo
              </>
            ) : (
              <>
                <ToggleLeft className="w-3 h-3 mr-1" />
                Inactivo
              </>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'stats',
      header: 'Movimientos',
      cell: ({ row }) => {
        const stats = row.getValue('stats') as WarehouseWithStats['stats'];
        return (
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{stats?.totalMovements || 0}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha Creación',
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const warehouse = row.original;
        const isPending =
          deactivateWarehouse.isPending || deleteWarehouse.isPending || updateWarehouse.isPending;

        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('view', warehouse)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('edit', warehouse)}
              disabled={isPending}
              className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50"
              title="Editar almacén"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleActive(warehouse)}
              disabled={isPending}
              className={`h-8 w-8 p-0 ${
                warehouse.is_active
                  ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                  : 'text-green-600 hover:text-green-900 hover:bg-green-50'
              }`}
              title={warehouse.is_active ? 'Desactivar almacén' : 'Activar almacén'}
            >
              <Power className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePermanentDelete(warehouse.warehouse_id, warehouse.name)}
              disabled={isPending}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"
              title="Eliminar permanentemente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Helmet>
        <title>Almacenes | AgroPanel</title>
        <meta name="description" content="Gestión de almacenes y depósitos" />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Gestión de Almacenes
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Administra los almacenes y depósitos de tu sistema
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button
                onClick={() => openModal('create')}
                disabled={isAnyMutationLoading}
                icon={<Plus className="h-5 w-5" />}
                iconPosition="left"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Nuevo Almacén
              </Button>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
            <div className="p-6">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error al cargar los almacenes
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          {error?.message ||
                            'Ocurrió un error al obtener los datos. Por favor, intenta de nuevo.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={warehouses || []}
                  searchKey="name"
                  searchPlaceholder="Buscar almacenes por nombre..."
                  loading={isLoading}
                  emptyMessage="No hay almacenes registrados"
                  enablePagination={true}
                  enableSorting={true}
                  enableColumnFilters={true}
                  pageSize={10}
                  onRowClick={warehouse => openModal('view', warehouse)}
                  className="mt-4"
                />
              )}

              {!isLoading && !error && (!warehouses || warehouses.length === 0) && (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay almacenes</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Comienza creando tu primer almacén para gestionar tu inventario.
                  </p>
                  <Button
                    onClick={() => openModal('create')}
                    icon={<Plus className="h-5 w-5" />}
                    iconPosition="left"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Crear Primer Almacén
                  </Button>
                </div>
              )}
            </div>
          </div>

          {warehouses && warehouses.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Warehouse className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Almacenes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{warehouses.length}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ToggleRight className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Almacenes Activos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {warehouses.filter(w => w.is_active).length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Activity className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Movimientos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {warehouses.reduce((acc, w) => acc + (w.stats?.totalMovements || 0), 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ToggleLeft className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Almacenes Inactivos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {warehouses.filter(w => !w.is_active).length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <WarehouseModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          warehouse={modal.warehouse}
          mode={modal.mode}
        />
      </DashboardLayout>

      <ToastContainer />
    </>
  );
};

export default WarehousesPage;
