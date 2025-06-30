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
  mode?: 'create' | 'edit';
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
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();

  const {
    form,
    handleSubmit,
    getFieldError,
    isValid,
    isDirty,
    isSubmitting,
  } = useStockMovementForm({
    initialData,
    mode,
    onSubmit,
  });

  const { register, watch, setValue } = form;
  const watchedValues = watch();

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
          onValueChange={(value) => setValue('movement_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{type.label}</span>
                  <span className="text-sm text-muted-foreground">{type.description}</span>
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
          {...register('quantity', { 
            valueAsNumber: true,
            required: 'La cantidad es requerida'
          })}
        />
        {getFieldError('quantity') && (
          <p className="text-sm text-red-500">{getFieldError('quantity')}</p>
        )}
      </div>

      {/* Producto */}
      <div className="space-y-2">
        <Label htmlFor="product_id" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Producto
        </Label>
        <Select
          value={watchedValues.product_id}
          onValueChange={(value) => setValue('product_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin producto específico</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.product_id} value={product.product_id}>
                <div className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  {product.description && (
                    <span className="text-sm text-muted-foreground">{product.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
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
          Almacén
        </Label>
        <Select
          value={watchedValues.warehouse_id}
          onValueChange={(value) => setValue('warehouse_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un almacén" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin almacén específico</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                <div className="flex flex-col">
                  <span className="font-medium">{warehouse.name}</span>
                  {warehouse.location && (
                    <span className="text-sm text-muted-foreground">{warehouse.location}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('warehouse_id') && (
          <p className="text-sm text-red-500">{getFieldError('warehouse_id')}</p>
        )}
      </div>

      {/* Fecha del Movimiento */}
      <div className="space-y-2">
        <Label htmlFor="movement_date" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fecha del Movimiento
        </Label>
        <Input
          id="movement_date"
          type="date"
          {...register('movement_date')}
        />
        {getFieldError('movement_date') && (
          <p className="text-sm text-red-500">{getFieldError('movement_date')}</p>
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
          placeholder="Información adicional del movimiento (opcional)"
          rows={3}
          {...register('reference')}
        />
        {getFieldError('reference') && (
          <p className="text-sm text-red-500">{getFieldError('reference')}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Puedes incluir detalles como número de factura, motivo del ajuste, etc.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={!isValid || isLoading || isSubmitting}
          className="min-w-32"
        >
          {isLoading || isSubmitting
            ? mode === 'create'
              ? 'Creando...'
              : 'Guardando...'
            : mode === 'create'
            ? 'Crear Movimiento'
            : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}