import React from 'react';
import { ArrowUpDown, Package, Warehouse, Hash, FileText, Calendar } from 'lucide-react';
import { useStockMovementForm } from '../../../hooks/useStockMovementForm';
import { StockMovementFormData } from '../../../services/api/stockMovementService';
import { useProducts } from '../../../hooks/useProducts';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

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
    : (warehousesData as any)?.data
      ? (warehousesData as any).data
      : [];

  const validProducts = products.filter(p => p && p.product_id && p.name);
  const validWarehouses = warehouses.filter((w: any) => w && w.warehouse_id && w.name);

  const { form, handleSubmit, getFieldError } = useStockMovementForm({
    initialData,
    mode: mode === 'view' ? 'edit' : mode,
    onSubmit,
  });

  const { register, watch, setValue } = form;
  const watchedValues = watch();

  // Determinar si el formulario es de solo lectura
  const isViewMode = mode === 'view';

  // Componente para campos de solo lectura
  const ViewField: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
  }> = ({ label, value, icon, description }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 flex items-center">
        {icon}
        {label}
      </label>
      {description && <p className="text-xs text-neutral-500">{description}</p>}
      <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
        <span className="text-neutral-800">{value || 'No especificado'}</span>
      </div>
    </div>
  );

  // Función para obtener el nombre del producto
  const getProductName = (productId: string) => {
    const product = validProducts.find(p => p.product_id === productId);
    return product?.name || 'Producto no encontrado';
  };

  // Función para obtener el nombre del almacén
  const getWarehouseName = (warehouseId: string) => {
    const warehouse = validWarehouses.find((w: any) => w.warehouse_id === warehouseId);
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

  // Formulario de solo lectura
  if (isViewMode) {
    return (
      <div className="space-y-6">
        <ViewField
          label="Tipo de Movimiento"
          value={getMovementTypeLabel(watchedValues.movement_type)}
          icon={<ArrowUpDown className="inline h-4 w-4 mr-2" />}
          description="Tipo de operación de stock"
        />

        <ViewField
          label="Cantidad"
          value={watchedValues.quantity?.toString() || '0'}
          icon={<Hash className="inline h-4 w-4 mr-2" />}
          description="Cantidad de unidades"
        />

        <ViewField
          label="Producto"
          value={getProductName(watchedValues?.product_id || '')}
          icon={<Package className="inline h-4 w-4 mr-2" />}
          description="Producto afectado"
        />

        <ViewField
          label="Almacén"
          value={getWarehouseName(watchedValues?.warehouse_id || '')}
          icon={<Warehouse className="inline h-4 w-4 mr-2" />}
          description="Almacén de origen/destino"
        />

        <ViewField
          label="Referencia"
          value={watchedValues.reference || 'Sin referencia'}
          icon={<FileText className="inline h-4 w-4 mr-2" />}
          description="Notas o referencias adicionales"
        />

        <ViewField
          label="Fecha del Movimiento"
          value={
            watchedValues.movement_date
              ? new Date(watchedValues.movement_date).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Sin fecha'
          }
          icon={<Calendar className="inline h-4 w-4 mr-2" />}
          description="Fecha de la operación"
        />
      </div>
    );
  }

  // Formulario editable
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Movimiento */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 flex items-center">
          <ArrowUpDown className="inline h-4 w-4 mr-2" />
          Tipo de Movimiento <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-xs text-neutral-500">Selecciona el tipo de operación de stock</p>
        <Select
          value={watchedValues.movement_type}
          onValueChange={value => setValue('movement_type', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona el tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-neutral-500">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('movement_type') && (
          <p className="text-sm text-red-500">{getFieldError('movement_type')}</p>
        )}
      </div>

      {/* Cantidad */}
      <Input
        {...register('quantity', { valueAsNumber: true })}
        label="Cantidad"
        type="number"
        min="0"
        step="0.01"
        placeholder="0"
        icon={<Hash className="h-4 w-4" />}
        disabled={isLoading}
        error={getFieldError('quantity')}
        description="Cantidad de unidades del movimiento"
        required
      />

      {/* Producto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 flex items-center">
          <Package className="inline h-4 w-4 mr-2" />
          Producto <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-xs text-neutral-500">Selecciona el producto para el movimiento</p>
        <Select
          value={watchedValues.product_id}
          onValueChange={value => setValue('product_id', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
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
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-neutral-500">
                        Lote: {product.batch_number} | País: {product.origin_country}
                      </div>
                    </div>
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
        <label className="text-sm font-medium text-neutral-700 flex items-center">
          <Warehouse className="inline h-4 w-4 mr-2" />
          Almacén <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-xs text-neutral-500">Selecciona el almacén de origen o destino</p>
        <Select
          value={watchedValues.warehouse_id}
          onValueChange={value => setValue('warehouse_id', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un almacén" />
          </SelectTrigger>
          <SelectContent>
            {validWarehouses.length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                No hay almacenes disponibles
              </div>
            ) : (
              validWarehouses
                .filter((warehouse: any) => warehouse?.warehouse_id && warehouse?.name)
                .map((warehouse: any) => (
                  <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    <div>
                      <div className="font-medium">{warehouse.name}</div>
                      <div className="text-xs text-neutral-500">{warehouse.location}</div>
                    </div>
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
        <label className="text-sm font-medium text-neutral-700 flex items-center">
          <FileText className="inline h-4 w-4 mr-2" />
          Referencia
        </label>
        <p className="text-xs text-neutral-500">Notas o referencias adicionales (opcional)</p>
        <Textarea
          {...register('reference')}
          placeholder="Ingresa referencias, notas o observaciones..."
          disabled={isLoading}
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {getFieldError('reference') && (
          <p className="text-sm text-red-500">{getFieldError('reference')}</p>
        )}
      </div>

      {/* Fecha del Movimiento */}
      <Input
        {...register('movement_date')}
        label="Fecha del Movimiento"
        type="date"
        icon={<Calendar className="h-4 w-4" />}
        disabled={isLoading}
        error={getFieldError('movement_date')}
        description="Fecha cuando se realizó la operación"
        required
      />
    </form>
  );
}
