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
} from 'lucide-react';
import { useWarehouseForm } from '../../../hooks/useWarehouseForm';
import { Database } from '../../../types/database';
import { useCreateWarehouse, useUpdateWarehouse } from '../../../hooks/useWarehouse';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { cn } from '../../../lib/utils';

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

  // Preparar datos iniciales
  const initialData = warehouse
    ? {
        name: warehouse.name,
        location: warehouse.location,
        is_active: warehouse.is_active,
      }
    : undefined;

  // Hooks de mutación
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const { form, handleSubmit, isValid, isDirty, resetForm } = useWarehouseForm({
    initialData,
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

  // Obtener valores actuales del formulario o del warehouse original
  const currentName = form.watch('name') || warehouse?.name || '';
  const currentLocation = form.watch('location') || warehouse?.location || '';
  // Para is_active, usar el valor del warehouse directamente en modo view, sino el del form
  const currentIsActive = isViewMode
    ? (warehouse?.is_active ?? true)
    : (form.watch('is_active') ?? warehouse?.is_active ?? true);

  console.log('Modal values:', {
    mode,
    warehouseIsActive: warehouse?.is_active,
    formIsActive: form.watch('is_active'),
    currentIsActive,
    warehouseName: warehouse?.name,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-apple transition-all duration-300"
        style={{ backgroundColor: 'hsl(var(--neutral-900) / 0.5)' }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'card relative w-full transform transition-all duration-300 animate-slide-in-bottom',
            isViewMode ? 'max-w-5xl' : 'max-w-2xl'
          )}
          style={{
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'var(--shadow-2xl)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-muted px-8 py-6">
            <div>
              <h3
                className="text-xl font-semibold flex items-center"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{
                    backgroundColor: 'hsl(var(--primary-50))',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <Warehouse className="h-5 w-5 text-primary" />
                </div>
                {getModalTitle()}
                <span
                  className={cn(
                    'badge ml-3',
                    isViewMode && 'badge-primary',
                    isEditMode && 'badge-warning',
                    isCreateMode && 'badge-success'
                  )}
                >
                  {isViewMode ? 'Solo lectura' : isEditMode ? 'Editando' : 'Creando'}
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted">{getModalDescription()}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              disabled={isPending}
              className="hover-lift"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Input de Nombre */}
                {isViewMode ? (
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'hsl(var(--neutral-700))' }}
                    >
                      <Warehouse className="inline h-4 w-4 mr-2" />
                      Nombre del Almacén
                    </label>
                    <div
                      className="form-input flex items-center"
                      style={{ backgroundColor: 'hsl(var(--neutral-50))' }}
                    >
                      <span style={{ color: 'hsl(var(--foreground))' }}>{currentName}</span>
                    </div>
                  </div>
                ) : (
                  <Input
                    {...form.register('name')}
                    label="Nombre del Almacén"
                    placeholder="Ej: Almacén Central"
                    icon={<Warehouse className="h-4 w-4" />}
                    disabled={isPending}
                    error={form.formState.errors.name?.message}
                    description="Nombre identificativo del almacén"
                  />
                )}

                {/* Input de Ubicación */}
                {isViewMode ? (
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'hsl(var(--neutral-700))' }}
                    >
                      <MapPin className="inline h-4 w-4 mr-2" />
                      Ubicación
                    </label>
                    <div
                      className="form-input flex items-center"
                      style={{ backgroundColor: 'hsl(var(--neutral-50))' }}
                    >
                      <span style={{ color: 'hsl(var(--foreground))' }}>{currentLocation}</span>
                    </div>
                  </div>
                ) : (
                  <Input
                    {...form.register('location')}
                    label="Ubicación"
                    placeholder="Ej: Córdoba, Argentina"
                    icon={<MapPin className="h-4 w-4" />}
                    disabled={isPending}
                    error={form.formState.errors.location?.message}
                    description="Dirección o ubicación física"
                  />
                )}

                <div className="md:col-span-2">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                    {isViewMode ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-neutral-700">
                            Estado del Almacén
                          </span>
                          <span
                            className={cn(
                              'badge',
                              currentIsActive ? 'badge-success' : 'badge-danger'
                            )}
                          >
                            {currentIsActive ? (
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
                      </div>
                    ) : (
                      <Checkbox
                        {...form.register('is_active')}
                        variant="switch"
                        size="default"
                        checked={currentIsActive}
                        onCheckedChange={checked => form.setValue('is_active', checked)}
                        label="Estado del Almacén"
                        description={
                          currentIsActive
                            ? 'El almacén está activo y puede recibir movimientos de stock.'
                            : 'El almacén está inactivo y no puede recibir nuevos movimientos.'
                        }
                        disabled={isPending}
                      />
                    )}
                  </div>
                </div>
              </div>

              {isViewMode && warehouse && (
                <div className="border-t border-muted pt-6">
                  <h4
                    className="text-lg font-semibold mb-6 flex items-center"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    <Activity className="w-5 h-5 mr-2 text-primary" />
                    Estadísticas del Almacén
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Card de Movimientos */}
                    <div
                      className="p-6 border hover-lift"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary-50)), hsl(var(--primary-100)))',
                        borderColor: 'hsl(var(--primary-200))',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className="p-3"
                          style={{
                            backgroundColor: 'hsl(var(--primary))',
                            borderRadius: 'var(--radius-lg)',
                          }}
                        >
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-primary">Total Movimientos</p>
                          <p
                            className="text-2xl font-bold"
                            style={{ color: 'hsl(var(--primary-900))' }}
                          >
                            {warehouse.stats?.totalMovements || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card de Fecha */}
                    <div
                      className="p-6 border hover-lift"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--success-50)), hsl(var(--success-100)))',
                        borderColor: 'hsl(var(--success-200))',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className="p-3"
                          style={{
                            backgroundColor: 'hsl(var(--success))',
                            borderRadius: 'var(--radius-lg)',
                          }}
                        >
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-success">Fecha Creación</p>
                          <p
                            className="text-sm font-bold"
                            style={{ color: 'hsl(var(--success-900))' }}
                          >
                            {warehouse.created_at
                              ? new Date(warehouse.created_at).toLocaleDateString('es-ES')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card de Estado */}
                    <div
                      className="p-6 border hover-lift"
                      style={{
                        background: 'linear-gradient(135deg, hsl(220 70% 97%), hsl(220 70% 93%))',
                        borderColor: 'hsl(220 70% 85%)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className="p-3"
                          style={{
                            backgroundColor: 'hsl(220 70% 50%)',
                            borderRadius: 'var(--radius-lg)',
                          }}
                        >
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium" style={{ color: 'hsl(220 70% 40%)' }}>
                            Estado
                          </p>
                          <p className="text-sm font-bold" style={{ color: 'hsl(220 70% 15%)' }}>
                            {currentIsActive ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {warehouse.stats?.recentMovements &&
                    warehouse.stats.recentMovements.length > 0 && (
                      <div>
                        <h5
                          className="text-md font-medium mb-4"
                          style={{ color: 'hsl(var(--foreground))' }}
                        >
                          Movimientos Recientes
                        </h5>
                        <div
                          className="p-4 border border-muted"
                          style={{
                            backgroundColor: 'hsl(var(--neutral-50))',
                            borderRadius: 'var(--radius-lg)',
                          }}
                        >
                          <div className="space-y-3">
                            {warehouse.stats.recentMovements.slice(0, 5).map(movement => (
                              <div
                                key={movement.movement_id}
                                className="card p-4 hover-lift"
                                style={{
                                  backgroundColor: 'hsl(var(--background))',
                                  borderColor: 'hsl(var(--neutral-100))',
                                  borderRadius: 'var(--radius)',
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                                    ></div>
                                    <div>
                                      <span
                                        className="font-medium"
                                        style={{ color: 'hsl(var(--foreground))' }}
                                      >
                                        {movement.movement_type}
                                      </span>
                                      {movement.products?.name && (
                                        <span className="ml-2 text-muted">
                                          - {movement.products.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-muted">
                                      {new Date(movement.movement_date).toLocaleDateString('es-ES')}
                                    </div>
                                    <div
                                      className="font-medium"
                                      style={{ color: 'hsl(var(--foreground))' }}
                                    >
                                      {movement.quantity} unidades
                                    </div>
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

          {/* Footer */}
          <div
            className="flex justify-end space-x-3 border-t border-muted px-8 py-6"
            style={{
              backgroundColor: 'hsl(var(--neutral-50) / 0.5)',
              borderBottomLeftRadius: 'var(--radius-2xl)',
              borderBottomRightRadius: 'var(--radius-2xl)',
            }}
          >
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </Button>

            {!isViewMode && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!isValid || isPending || (!isDirty && isEditMode)}
                loading={isPending}
              >
                {isCreateMode ? 'Crear Almacén' : 'Actualizar Almacén'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
