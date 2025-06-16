// frontend/src/components/modules/warehouses/WarehouseModal.tsx
import React, { useEffect } from 'react';
import {
  X,
  Warehouse,
  MapPin,
  Activity,
  Package,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { useWarehouseForm } from '../../../hooks/useWarehouseForm';
import { Database } from '../../../types/database';
import { useCreateWarehouse, useUpdateWarehouse } from '../../../hooks/useWarehouse';

type WarehouseType = Database['public']['Tables']['warehouse']['Row'];

interface WarehouseWithStats extends WarehouseType {
  stats?: {
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

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse?: WarehouseWithStats;
  mode: 'create' | 'edit' | 'view';
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  mode,
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // Hooks de mutación
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const { form, handleSubmit, isValid, isDirty, resetForm } = useWarehouseForm({
    initialData: warehouse,
    mode,
    onSubmit: async data => {
      if (isCreateMode) {
        await createWarehouse.mutateAsync(data);
      } else if (isEditMode && warehouse) {
        await updateWarehouse.mutateAsync({
          id: warehouse.warehouse_id,
          data,
        });
      }
      onClose();
    },
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && isCreateMode) {
      resetForm();
    }
  }, [isOpen, isCreateMode, resetForm]);

  if (!isOpen) return null;

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Crear Nuevo Almacén';
      case 'edit':
        return 'Editar Almacén';
      case 'view':
        return 'Detalles del Almacén';
      default:
        return 'Almacén';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete la información para crear un nuevo almacén.';
      case 'edit':
        return `Modifique los campos que desee actualizar para "${warehouse?.name}".`;
      case 'view':
        return `Información detallada del almacén "${warehouse?.name}" y sus estadísticas.`;
      default:
        return '';
    }
  };

  const isPending = createWarehouse.isPending || updateWarehouse.isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full max-w-4xl transform rounded-lg bg-white shadow-xl transition-all ${
            isViewMode ? 'max-w-5xl' : 'max-w-2xl'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Warehouse className="mr-2 h-5 w-5 text-green-600" />
                {getModalTitle()}
                <span
                  className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isViewMode
                      ? 'bg-blue-100 text-blue-800'
                      : isEditMode
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {isViewMode ? 'Solo lectura' : isEditMode ? 'Editando' : 'Creando'}
                </span>
              </h3>
              <p className="mt-1 text-sm text-gray-500">{getModalDescription()}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors"
              disabled={isPending}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Debug temporal para modo edición */}
              {process.env.NODE_ENV === 'development' && mode === 'edit' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
                  <strong>Debug - Valores del formulario:</strong>
                  <div>Mode: {mode}</div>
                  <div>Warehouse name: {warehouse?.name}</div>
                  <div>Form name: {form.watch('name')}</div>
                  <div>Form location: {form.watch('location')}</div>
                  <div>Form is_active: {String(form.watch('is_active'))}</div>
                  <div>Initial data: {JSON.stringify(initialData)}</div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Warehouse className="inline h-4 w-4 mr-2" />
                    Nombre del Almacén
                    {isPending && (
                      <span className="ml-2 text-xs text-gray-500">(Guardando...)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    {...form.register('name')}
                    disabled={isViewMode || isPending}
                    placeholder="Ej: Almacén Central"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm transition-colors ${
                      isViewMode || isPending
                        ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                        : 'bg-white hover:border-gray-400'
                    } ${
                      form.formState.errors.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : ''
                    }`}
                  />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-2" />
                    Ubicación
                    {isPending && (
                      <span className="ml-2 text-xs text-gray-500">(Guardando...)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    {...form.register('location')}
                    disabled={isViewMode || isPending}
                    placeholder="Ej: Córdoba, Argentina"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm transition-colors ${
                      isViewMode || isPending
                        ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                        : 'bg-white hover:border-gray-400'
                    } ${
                      form.formState.errors.location
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : ''
                    }`}
                  />
                  {form.formState.errors.location && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>

                {(isEditMode || isViewMode) && (
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <label className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700">
                            Estado del Almacén
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              form.watch('is_active')
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {form.watch('is_active') ? (
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
                        </div>

                        {!isViewMode && (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              {...form.register('is_active')}
                              disabled={isPending}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                        )}
                      </label>

                      {!isViewMode && (
                        <p className="mt-2 text-xs text-gray-500">
                          {form.watch('is_active')
                            ? 'El almacén está activo y puede recibir movimientos de stock.'
                            : 'El almacén está inactivo y no puede recibir nuevos movimientos.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isViewMode && warehouse && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Estadísticas del Almacén
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Package className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Total Movimientos</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {warehouse.stats?.totalMovements || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">Fecha Creación</p>
                          <p className="text-sm font-bold text-green-900">
                            {warehouse.created_at
                              ? new Date(warehouse.created_at).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Activity className="w-8 h-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-600">Estado</p>
                          <p className="text-sm font-bold text-purple-900">
                            {warehouse.is_active ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {warehouse.stats?.recentMovements &&
                    warehouse.stats.recentMovements.length > 0 && (
                      <div>
                        <h5 className="text-md font-medium text-gray-900 mb-3">
                          Movimientos Recientes
                        </h5>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {warehouse.stats.recentMovements.slice(0, 5).map(movement => (
                              <div
                                key={movement.movement_id}
                                className="flex justify-between items-center p-3 bg-white rounded border"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      {movement.movement_type}
                                    </span>
                                    {movement.products?.name && (
                                      <span className="ml-2 text-gray-600">
                                        - {movement.products.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500">
                                    {new Date(movement.movement_date).toLocaleDateString()}
                                  </div>
                                  <div className="font-medium text-gray-900">
                                    {movement.quantity} unidades
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </form>
          </div>

          <div className="flex justify-end space-x-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </button>

            {!isViewMode && (
              <button
                type="submit"
                form="warehouse-form"
                onClick={handleSubmit}
                disabled={!isValid || isPending || (!isDirty && isEditMode)}
                className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreateMode ? 'Crear Almacén' : 'Actualizar Almacén'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
