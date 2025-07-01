// src/components/features/stock-movements/stock-movement-form.tsx

import React from 'react';
import { ArrowUpDown, Package, Warehouse, Hash, FileText, Calendar } from 'lucide-react';
import { useStockMovementForm } from '../../../hooks/useStockMovementForm';
import { StockMovementFormData } from '../../../services/api/stockMovementService';
import { useProducts } from '../../../hooks/useProducts';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';

interface StockMovementFormProps {
  onSubmit: (data: StockMovementFormData) => void | Promise<void>;
  initialData?: Partial<StockMovementFormData>;
  mode?: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

const MOVEMENT_TYPES = [
  { value: 'entrada', label: 'Entrada', description: 'Ingreso de mercancía al inventario' },
  { value: 'salida', label: 'Salida', description: 'Salida de mercancía del inventario' },
  { value: 'ajuste', label: 'Ajuste', description: 'Corrección de inventario' },
  { value: 'transferencia', label: 'Transferencia', description: 'Movimiento entre almacenes' },
];

export function StockMovementForm({
  onSubmit,
  initialData,
  mode = 'create',
  isLoading = false,
}: StockMovementFormProps) {
  const {
    data: productsData = [],
    isLoading: productsLoading,
    error: productsError,
  } = useProducts();
  const {
    data: warehousesData = [],
    isLoading: warehousesLoading,
    error: warehousesError,
  } = useWarehouses();

  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData)
    ? warehousesData
    : warehousesData?.data
      ? warehousesData.data
      : [];

  const validProducts = products.filter(p => p && p.product_id && p.name);
  const validWarehouses = warehouses.filter(w => w && w.warehouse_id && w.name);

  console.log('Valid data:', { validProducts, warehouses });

  console.log('Products hook response:', {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  });
  console.log('Warehouses hook response:', {
    data: warehousesData,
    isLoading: warehousesLoading,
    error: warehousesError,
  });
  console.log('Processed arrays:', { products, warehouses });

  const { form, handleSubmit, getFieldError, isValid, isDirty, isSubmitting } =
    useStockMovementForm({
      initialData,
      mode,
      onSubmit,
    });

  const { register, watch, setValue } = form;
  const watchedValues = watch();

  // Determinar si el formulario es de solo lectura
  const isReadOnly = mode === 'view';

  // Función para mostrar valores de solo lectura
  const renderReadOnlyField = (label: string, value: string | number, icon: React.ReactNode) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="px-3 py-2 bg-gray-50 rounded-md border">{value || 'No especificado'}</div>
    </div>
  );

  // Función para obtener el nombre del producto
  const getProductName = (productId: string) => {
    const product = validProducts.find(p => p.product_id === productId);
    return product?.name || 'Producto no encontrado';
  };

  // Función para obtener el nombre del almacén
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = validWarehouses.find(w => w.warehouse_id === warehouseId);
    return warehouse?.name || 'Almacén no encontrado';
  };

  // Función para obtener la etiqueta del tipo de movimiento
  const getMovementTypeLabel = (type: string) => {
    const movementType = MOVEMENT_TYPES.find(t => t.value === type);
    return movementType?.label || type;
  };

  // Mostrar loading si los datos están cargando
  if (productsLoading || warehousesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  // Mostrar error si hay problemas cargando los datos
  if (productsError || warehousesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
        <p className="text-red-600 text-sm">
          {productsError?.message || warehousesError?.message || 'Error desconocido'}
        </p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="space-y-6">
        {renderReadOnlyField(
          'Tipo de Movimiento',
          getMovementTypeLabel(watchedValues.movement_type),
          <ArrowUpDown className="h-4 w-4" />
        )}

        {renderReadOnlyField(
          'Cantidad',
          watchedValues.quantity?.toString() || '0',
          <Hash className="h-4 w-4" />
        )}

        {renderReadOnlyField(
          'Producto',
          getProductName(watchedValues?.product_id),
          <Package className="h-4 w-4" />
        )}

        {renderReadOnlyField(
          'Almacén',
          getWarehouseName(watchedValues?.warehouse_id),
          <Warehouse className="h-4 w-4" />
        )}

        {renderReadOnlyField(
          'Referencia',
          watchedValues.reference || 'Sin referencia',
          <FileText className="h-4 w-4" />
        )}

        {renderReadOnlyField(
          'Fecha del Movimiento',
          watchedValues.movement_date
            ? new Date(watchedValues.movement_date).toLocaleDateString()
            : 'Sin fecha',
          <Calendar className="h-4 w-4" />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Movimiento */}
      <div className="space-y-2">
        <Label htmlFor="movement_type" className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Tipo de Movimiento <span className="text-red-500">*</span>
        </Label>
        <Select
          value={watchedValues.movement_type}
          onValueChange={value => setValue('movement_type', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('movement_type') && (
          <p className="text-sm text-red-500">{getFieldError('movement_type')}</p>
        )}
      </div>

      {/* Cantidad */}
      <div className="space-y-2">
        <Label htmlFor="quantity" className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Cantidad <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ingresa la cantidad"
          {...register('quantity', { valueAsNumber: true })}
          disabled={isLoading}
        />
        {getFieldError('quantity') && (
          <p className="text-sm text-red-500">{getFieldError('quantity')}</p>
        )}
      </div>

      {/* Producto */}
      <div className="space-y-2">
        <Label htmlFor="product_id" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Producto <span className="text-red-500">*</span>
        </Label>
        <Select
          value={watchedValues.product_id}
          onValueChange={value => setValue('product_id', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un producto" />
          </SelectTrigger>
          <SelectContent>
            {validProducts.length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                No hay productos disponibles
              </div>
            ) : (
              validProducts
                .filter(product => product?.product_id && product?.name)
                .map(product => (
                  <SelectItem key={product.product_id} value={product.product_id}>
                    {product.name}
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
        {getFieldError('product_id') && (
          <p className="text-sm text-red-500">{getFieldError('product_id')}</p>
        )}
      </div>

      {/* Almacén */}
      <div className="space-y-2">
        <Label htmlFor="warehouse_id" className="flex items-center gap-2">
          <Warehouse className="h-4 w-4" />
          Almacén <span className="text-red-500">*</span>
        </Label>
        <Select
          value={watchedValues.warehouse_id}
          onValueChange={value => setValue('warehouse_id', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un almacén" />
          </SelectTrigger>
          <SelectContent>
            {validWarehouses.length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                No hay almacenes disponibles
              </div>
            ) : (
              validWarehouses
                .filter(warehouse => warehouse?.warehouse_id && warehouse?.name)
                .map(warehouse => (
                  <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.name} - {warehouse.location}
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
        {getFieldError('warehouse_id') && (
          <p className="text-sm text-red-500">{getFieldError('warehouse_id')}</p>
        )}
      </div>

      {/* Referencia */}
      <div className="space-y-2">
        <Label htmlFor="reference" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Referencia
        </Label>
        <Textarea
          id="reference"
          placeholder="Referencia o notas adicionales (opcional)"
          {...register('reference')}
          disabled={isLoading}
          rows={3}
        />
        {getFieldError('reference') && (
          <p className="text-sm text-red-500">{getFieldError('reference')}</p>
        )}
      </div>

      {/* Fecha del Movimiento */}
      <div className="space-y-2">
        <Label htmlFor="movement_date" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fecha del Movimiento <span className="text-red-500">*</span>
        </Label>
        <Input id="movement_date" type="date" {...register('movement_date')} disabled={isLoading} />
        {getFieldError('movement_date') && (
          <p className="text-sm text-red-500">{getFieldError('movement_date')}</p>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={isLoading || isSubmitting || !isValid} className="min-w-32">
          {isLoading || isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {mode === 'create' ? 'Creando...' : 'Guardando...'}
            </>
          ) : mode === 'create' ? (
            'Crear Movimiento'
          ) : (
            'Guardar Cambios'
          )}
        </Button>
      </div>
    </form>
  );
}
