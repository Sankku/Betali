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
  onCancel?: () => void;
}

const MOVEMENT_TYPES = [
  {
    value: 'entry',
    label: 'Entry',
    description: 'Goods entry to inventory',
    color: 'text-green-700',
  },
  {
    value: 'exit',
    label: 'Exit',
    description: 'Goods exit from inventory',
    color: 'text-red-700',
  },
  {
    value: 'adjustment',
    label: 'Adjustment',
    description: 'Inventory correction',
    color: 'text-blue-700',
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Regulatory compliance movement',
    color: 'text-purple-700',
  },
];

export function StockMovementForm({
  onSubmit,
  initialData,
  mode = 'create',
  isLoading = false,
  onCancel,
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
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  const validProducts = products.filter(p => p && p.product_id && p.name);
  const validWarehouses = warehouses.filter((w: any) => w && w.warehouse_id && w.name);

  const { form, handleSubmit, getFieldError } = useStockMovementForm({
    initialData,
    mode: mode === 'view' ? 'edit' : mode,
    onSubmit,
  });

  const { register, watch, setValue } = form;
  const watchedValues = watch();

  const isViewMode = mode === 'view';

  const ViewField: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
  }> = ({ label, value, icon, description }) => (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-neutral-800 flex items-center">
        <span className="text-neutral-600 mr-2">{icon}</span>
        {label}
      </label>
      {description && <p className="text-xs text-neutral-600">{description}</p>}
      <div className="w-full rounded-lg border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
        <span className="text-neutral-900 font-medium">{value || 'Not specified'}</span>
      </div>
    </div>
  );

  const getProductName = (productId: string) => {
    const product = validProducts.find(p => p.product_id === productId);
    return product?.name || 'Product not found';
  };

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = validWarehouses.find((w: any) => w.warehouse_id === warehouseId);
    return warehouse?.name || 'Warehouse not found';
  };

  const getMovementTypeLabel = (type: string) => {
    const movementType = MOVEMENT_TYPES.find(t => t.value === type);
    return movementType?.label || type;
  };

  if (productsLoading || warehousesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-neutral-600">Loading data...</span>
        </div>
      </div>
    );
  }

  if (productsError || warehousesError) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">Error loading data</h3>
            <p className="text-red-700 text-sm mt-1">
              {productsError?.message || warehousesError?.message || 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="space-y-6">
        <ViewField
          label="Movement Type"
          value={getMovementTypeLabel(watchedValues.movement_type)}
          icon={<ArrowUpDown className="h-4 w-4" />}
          description="Type of stock operation"
        />

        <ViewField
          label="Quantity"
          value={watchedValues.quantity?.toString() || '0'}
          icon={<Hash className="h-4 w-4" />}
          description="Number of units"
        />

        <ViewField
          label="Product"
          value={getProductName(watchedValues?.product_id || '')}
          icon={<Package className="h-4 w-4" />}
          description="Affected product"
        />

        <ViewField
          label="Warehouse"
          value={getWarehouseName(watchedValues?.warehouse_id || '')}
          icon={<Warehouse className="h-4 w-4" />}
          description="Source/destination warehouse"
        />

        <ViewField
          label="Reference"
          value={watchedValues.reference || 'No reference'}
          icon={<FileText className="h-4 w-4" />}
          description="Additional notes or references"
        />

        <ViewField
          label="Movement Date"
          value={
            watchedValues.movement_date
              ? new Date(watchedValues.movement_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'No date'
          }
          icon={<Calendar className="h-4 w-4" />}
          description="Date of operation"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-800 flex items-center">
          <ArrowUpDown className="h-4 w-4 mr-2 text-neutral-600" />
          Movement Type <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-xs text-neutral-600">Select the type of stock operation</p>
        <Select
          value={watchedValues.movement_type}
          onValueChange={value => setValue('movement_type', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select movement type" />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col space-y-1">
                  <div className={`font-semibold ${type.color}`}>{type.label}</div>
                  <div className="text-xs text-neutral-600">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('movement_type') && (
          <p className="text-sm text-red-600 font-medium">{getFieldError('movement_type')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          {...register('quantity', { valueAsNumber: true })}
          label="Quantity"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          icon={<Hash className="h-4 w-4" />}
          disabled={isLoading}
          error={getFieldError('quantity')}
          description="Number of units in the movement"
          required
        />

        <Input
          {...register('movement_date')}
          label="Movement Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          disabled={isLoading}
          error={getFieldError('movement_date')}
          description="Date when the operation was performed"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Package className="h-4 w-4 mr-2 text-neutral-600" />
            Product <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-neutral-600">Select the product for the movement</p>
          <Select
            value={watchedValues.product_id}
            onValueChange={value => setValue('product_id', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {validProducts.length === 0 ? (
                <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                  No products available
                </div>
              ) : (
                validProducts
                  .filter(product => product?.product_id && product?.name)
                  .map(product => (
                    <SelectItem key={product.product_id} value={product.product_id}>
                      <div className="flex flex-col space-y-1">
                        <div className="font-semibold text-neutral-900">{product.name}</div>
                        <div className="text-xs text-neutral-600">
                          Batch: <span className="font-medium">{product.batch_number}</span> | Country:{' '}
                          <span className="font-medium">{product.origin_country}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
          {getFieldError('product_id') && (
            <p className="text-sm text-red-600 font-medium">{getFieldError('product_id')}</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Warehouse className="h-4 w-4 mr-2 text-neutral-600" />
            Warehouse <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-neutral-600">Select the source or destination warehouse</p>
          <Select
            value={watchedValues.warehouse_id}
            onValueChange={value => setValue('warehouse_id', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a warehouse" />
            </SelectTrigger>
            <SelectContent>
              {validWarehouses.length === 0 ? (
                <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                  No warehouses available
                </div>
              ) : (
                validWarehouses
                  .filter((warehouse: any) => warehouse?.warehouse_id && warehouse?.name)
                  .map((warehouse: any) => (
                    <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      <div className="flex flex-col space-y-1">
                        <div className="font-semibold text-neutral-900">{warehouse.name}</div>
                        <div className="text-xs text-neutral-600">
                          <span className="font-medium">{warehouse.location}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
          {getFieldError('warehouse_id') && (
            <p className="text-sm text-red-600 font-medium">{getFieldError('warehouse_id')}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-800 flex items-center">
          <FileText className="h-4 w-4 mr-2 text-neutral-600" />
          Reference
        </label>
        <p className="text-xs text-neutral-600">Additional notes or references (optional)</p>
        <Textarea
          {...register('reference')}
          placeholder="Enter references, notes or observations..."
          disabled={isLoading}
          rows={3}
          className="resize-none"
        />
        {getFieldError('reference') && (
          <p className="text-sm text-red-600 font-medium">{getFieldError('reference')}</p>
        )}
      </div>

      {!isViewMode && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {mode === 'create' ? 'Create Movement' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  );
}
