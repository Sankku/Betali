import React from 'react';
import { ArrowUpDown, Package, Warehouse, Hash, FileText, Calendar } from 'lucide-react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useStockMovementForm } from '../../../hooks/useStockMovementForm';
import { StockMovementFormData } from '../../../services/api/stockMovementService';
import { useProductTypes } from '../../../hooks/useProductTypes';
import { useProductLots } from '../../../hooks/useProductLots';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { DatePicker } from '../../ui/date-picker';
import { ProductionMovementForm } from './ProductionMovementForm';

interface StockMovementFormProps {
  onSubmit: (data: StockMovementFormData) => void | Promise<void>;
  initialData?: Partial<StockMovementFormData>;
  mode?: 'create' | 'edit' | 'view';
  isLoading?: boolean;
  onCancel?: () => void;
}

const MOVEMENT_TYPE_KEYS = [
  { value: 'entry',      labelKey: 'stockMovements.types.entry',      descKey: 'stockMovements.types.entryDesc',      color: 'text-green-700'  },
  { value: 'exit',       labelKey: 'stockMovements.types.exit',       descKey: 'stockMovements.types.exitDesc',       color: 'text-red-700'    },
  { value: 'adjustment', labelKey: 'stockMovements.types.adjustment', descKey: 'stockMovements.types.adjustmentDesc', color: 'text-blue-700'   },
  { value: 'compliance', labelKey: 'stockMovements.types.compliance', descKey: 'stockMovements.types.complianceDesc', color: 'text-purple-700' },
  { value: 'production', labelKey: 'stockMovements.types.production', descKey: 'stockMovements.types.productionDesc', color: 'text-orange-700' },
];

// ─── Tooltip wrapper ───────────────────────────────────────────────────────────
// Uses the native <title> attribute via a wrapping span so the browser shows
// the full text on hover when content is truncated.
function WithTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span title={label} className="block min-w-0">
      {children}
    </span>
  );
}

// ─── Unified field wrapper ─────────────────────────────────────────────────────
// Keeps label + description in a block with a fixed min-height so every column
// in a 2-col grid always has its control at the same vertical position,
// regardless of whether the description wraps or not.
function FormField({
  label,
  description,
  icon,
  required,
  error,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Fixed-height header: icon + label + description */}
      <div className="min-h-[3rem]">
        <label className="text-sm font-semibold text-neutral-800 flex items-center">
          {icon && <span className="text-neutral-600 mr-2 flex-shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 ml-1 flex-shrink-0">*</span>}
        </label>
        {description && (
          <p className="text-xs text-neutral-600 mt-0.5 line-clamp-2" title={description}>
            {description}
          </p>
        )}
      </div>
      {/* Control */}
      {children}
      {/* Error */}
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export function StockMovementForm({
  onSubmit,
  initialData,
  mode = 'create',
  isLoading = false,
  onCancel,
}: StockMovementFormProps) {
  const { t } = useTranslation();
  const productTypesQuery = useProductTypes();
  const warehousesQuery   = useWarehouses();

  const productTypesData = productTypesQuery.data || [];
  const warehousesData   = warehousesQuery.data?.data || [];

  const productTypes = Array.isArray(productTypesData) ? productTypesData : [];
  const warehouses   = Array.isArray(warehousesData) ? warehousesData : [];

  const productTypesLoading = productTypesQuery.isLoading;
  const warehousesLoading   = warehousesQuery.isLoading;
  const productTypesError   = productTypesQuery.error;
  const warehousesError     = warehousesQuery.error;

  const validProductTypes = productTypes.filter(p => p && p.product_type_id && p.name);
  const validWarehouses   = warehouses.filter((w: any) => w && w.warehouse_id && w.name);

  const { form, handleSubmit, getFieldError } = useStockMovementForm({
    initialData,
    mode: mode === 'view' ? 'edit' : mode,
    onSubmit,
  });

  const { register, watch, setValue } = form;
  const watchedValues = watch();
  const isViewMode = mode === 'view';

  // Fetch lots for the selected product type
  const selectedProductTypeId = watchedValues.product_type_id;
  const productLotsQuery = useProductLots(selectedProductTypeId || undefined);
  const productLots = productLotsQuery.data || [];
  const validProductLots = Array.isArray(productLots) ? productLots.filter(l => l && l.lot_id) : [];

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getProductTypeLabel = (productTypeId: string) => {
    const p = validProductTypes.find(p => p.product_type_id === productTypeId);
    return p ? p.name : t('stockMovements.form.productNotFound');
  };

  const getProductTypeSubtitle = (productTypeId: string) => {
    const p = validProductTypes.find(p => p.product_type_id === productTypeId);
    if (!p) return '';
    return p.sku ? `SKU: ${p.sku}` : '';
  };

  const getLotLabel = (lotId: string) => {
    const l = validProductLots.find(l => l.lot_id === lotId);
    return l ? l.lot_number : lotId;
  };

  const getWarehouseLabel = (warehouseId: string) => {
    const w = validWarehouses.find((w: any) => w.warehouse_id === warehouseId);
    return w ? w.name : t('stockMovements.form.warehouseNotFound');
  };

  const getWarehouseSubtitle = (warehouseId: string) => {
    const w = validWarehouses.find((w: any) => w.warehouse_id === warehouseId);
    return w?.location || '';
  };

  const getMovementTypeLabel = (type: string) => {
    const found = MOVEMENT_TYPE_KEYS.find(m => m.value === type);
    return found ? t(found.labelKey as any) : type;
  };

  // ── loading / error states ───────────────────────────────────────────────────
  if (productTypesLoading || warehousesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-neutral-600">{t('stockMovements.form.loadingData')}</span>
        </div>
      </div>
    );
  }

  if (productTypesError || warehousesError) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">{t('stockMovements.form.errorLoadingData')}</h3>
            <p className="text-red-700 text-sm mt-1">
              {productTypesError?.message || warehousesError?.message || 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── view mode ────────────────────────────────────────────────────────────────
  if (isViewMode) {
    const ViewField = ({ label, value, icon, description }: { label: string; value: string | number; icon: React.ReactNode; description?: string }) => (
      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-800 flex items-center">
          <span className="text-neutral-600 mr-2">{icon}</span>
          {label}
        </label>
        {description && <p className="text-xs text-neutral-600">{description}</p>}
        <div className="w-full rounded-lg border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
          <span className="text-neutral-900 font-medium">{value || t('stockMovements.form.notSpecified')}</span>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <ViewField label={t('stockMovements.form.movementType')}  value={getMovementTypeLabel(watchedValues.movement_type)} icon={<ArrowUpDown className="h-4 w-4" />} description={t('stockMovements.form.typeOfOperation')} />
        <ViewField label={t('stockMovements.form.quantity')}        value={watchedValues.quantity?.toString() || '0'}          icon={<Hash className="h-4 w-4" />}      description={t('stockMovements.form.numberOfUnits')} />
        <ViewField label={t('stockMovements.form.product')}         value={getProductTypeLabel(watchedValues?.product_type_id || '')}   icon={<Package className="h-4 w-4" />}   description={t('stockMovements.form.affectedProduct')} />
        <ViewField label="Lote"                                      value={getLotLabel(watchedValues?.lot_id || '')}            icon={<Hash className="h-4 w-4" />}      description="Lote del movimiento" />
        <ViewField label={t('stockMovements.form.warehouse')}       value={getWarehouseLabel(watchedValues?.warehouse_id || '')} icon={<Warehouse className="h-4 w-4" />} description={t('stockMovements.form.sourceWarehouse')} />
        <ViewField label={t('stockMovements.form.reference')}       value={watchedValues.reference || t('stockMovements.form.noReference')}          icon={<FileText className="h-4 w-4" />}  description={t('stockMovements.form.additionalNotes')} />
        <ViewField
          label={t('stockMovements.form.movementDate')}
          value={watchedValues.movement_date ? new Date(watchedValues.movement_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : t('stockMovements.form.noDate')}
          icon={<Calendar className="h-4 w-4" />}
          description={t('stockMovements.form.dateOfOperation')}
        />
      </div>
    );
  }

  // ── selected labels for tooltip ──────────────────────────────────────────────
  const selectedProductTypeLabel = watchedValues.product_type_id ? `${getProductTypeLabel(watchedValues.product_type_id)} — ${getProductTypeSubtitle(watchedValues.product_type_id)}` : '';
  const selectedWarehouseLabel   = watchedValues.warehouse_id ? `${getWarehouseLabel(watchedValues.warehouse_id)} — ${getWarehouseSubtitle(watchedValues.warehouse_id)}` : '';
  const isExitType = ['exit', 'production'].includes(watchedValues.movement_type);

  // ── edit / create mode ───────────────────────────────────────────────────────
  const isProduction = watchedValues.movement_type === 'production';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Movement Type — full width */}
      <FormField
        label={t('stockMovements.form.movementType')}
        description={t('stockMovements.form.movementTypeDesc')}
        icon={<ArrowUpDown className="h-4 w-4" />}
        required
        error={getFieldError('movement_type')}
      >
        <Select value={watchedValues.movement_type} onValueChange={v => setValue('movement_type', v)} disabled={isLoading}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('stockMovements.form.movementTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPE_KEYS.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col gap-0.5">
                  <span className={`font-semibold ${type.color}`}>{t(type.labelKey as any)}</span>
                  <span className="text-xs text-neutral-500">{t(type.descKey as any)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Production type — delegate entirely to the dedicated form */}
      {isProduction && (
        <ProductionMovementForm onSuccess={onCancel} onCancel={onCancel} />
      )}

      {/* Regular fields — hidden when production type is selected */}
      {!isProduction && (
        <>
          {/* Quantity + Date — 2 col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              label={t('stockMovements.form.quantity')}
              description={t('stockMovements.form.quantityDesc')}
              icon={<Hash className="h-4 w-4" />}
              required
              error={getFieldError('quantity')}
            >
              <div className="flex items-center gap-2">
                <input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  disabled={isLoading}
                  className="flex-1 rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-neutral-100 shadow-sm transition-all duration-200"
                />
                {watchedValues.product_type_id && (() => {
                  const unit = validProductTypes.find(p => p.product_type_id === watchedValues.product_type_id)?.unit;
                  return unit ? (
                    <span className="text-xs font-mono font-semibold px-2 py-1.5 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                      {unit}
                    </span>
                  ) : null;
                })()}
              </div>
            </FormField>

            <FormField
              label={t('stockMovements.form.movementDate')}
              description={t('stockMovements.form.movementDateDesc')}
              icon={<Calendar className="h-4 w-4" />}
              required
              error={getFieldError('movement_date')}
            >
              <DatePicker
                value={watchedValues.movement_date ? new Date(`${watchedValues.movement_date}T00:00:00`) : undefined}
                onChange={(date) => {
                  setValue('movement_date', date ? date.toISOString().split('T')[0] : '', { shouldValidate: true });
                }}
                disabled={isLoading}
                className="w-full h-[48px] rounded-lg border-2 border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm"
              />
            </FormField>
          </div>

          {/* Product Type + Lot + Warehouse — grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              label={t('stockMovements.form.product')}
              description={t('stockMovements.form.productDesc')}
              icon={<Package className="h-4 w-4" />}
              required
              error={getFieldError('product_type_id')}
            >
              <WithTooltip label={selectedProductTypeLabel}>
                <Select
                  value={watchedValues.product_type_id || ''}
                  onValueChange={v => {
                    setValue('product_type_id', v);
                    // Reset lot when product type changes
                    setValue('lot_id', '');
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('stockMovements.form.productPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {validProductTypes.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-neutral-500 text-center">{t('stockMovements.form.noProductsAvailable')}</div>
                    ) : (
                      validProductTypes
                        .filter(p => p?.product_type_id && p?.name)
                        .map(productType => (
                          <SelectItem key={productType.product_type_id} value={productType.product_type_id}>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-semibold text-neutral-900 truncate block" title={productType.name}>
                                {productType.name}
                              </span>
                              {productType.sku && (
                                <span className="text-xs text-neutral-500 truncate block" title={`SKU: ${productType.sku}`}>
                                  SKU: {productType.sku}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </WithTooltip>
            </FormField>

            <FormField
              label={t('stockMovements.form.warehouse')}
              description={t('stockMovements.form.warehouseDesc')}
              icon={<Warehouse className="h-4 w-4" />}
              required
              error={getFieldError('warehouse_id')}
            >
              <WithTooltip label={selectedWarehouseLabel}>
                <Select value={watchedValues.warehouse_id || ''} onValueChange={v => setValue('warehouse_id', v)} disabled={isLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('stockMovements.form.warehousePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {validWarehouses.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-neutral-500 text-center">{t('stockMovements.form.noWarehousesAvailable')}</div>
                    ) : (
                      validWarehouses
                        .filter((w: any) => w?.warehouse_id && w?.name)
                        .map((warehouse: any) => (
                          <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-semibold text-neutral-900 truncate block" title={warehouse.name}>
                                {warehouse.name}
                              </span>
                              {warehouse.location && (
                                <span className="text-xs text-neutral-500 truncate block" title={warehouse.location}>
                                  {warehouse.location}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </WithTooltip>
            </FormField>
          </div>

          {/* Lot selector — appears after a product type is selected */}
          {watchedValues.product_type_id && (
            <FormField
              label="Lote"
              description="Seleccionar el lote específico para este movimiento"
              icon={<Hash className="h-4 w-4" />}
              required
              error={getFieldError('lot_id')}
            >
              <Select
                value={watchedValues.lot_id || ''}
                onValueChange={v => setValue('lot_id', v)}
                disabled={isLoading || productLotsQuery.isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={productLotsQuery.isLoading ? 'Cargando lotes...' : 'Seleccionar lote'} />
                </SelectTrigger>
                <SelectContent>
                  {validProductLots.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                      {productLotsQuery.isLoading ? 'Cargando lotes...' : 'No hay lotes disponibles para este producto'}
                    </div>
                  ) : (
                    validProductLots.map(lot => (
                      <SelectItem key={lot.lot_id} value={lot.lot_id}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-neutral-900 truncate block">
                            {lot.lot_number}
                          </span>
                          {lot.expiration_date && (
                            <span className="text-xs text-neutral-500 truncate block">
                              Vence: {new Date(lot.expiration_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {/* Reference — full width */}
          <FormField
            label={t('stockMovements.form.reference')}
            description={t('stockMovements.form.referenceDesc')}
            icon={<FileText className="h-4 w-4" />}
            error={getFieldError('reference')}
          >
            <Textarea
              {...register('reference')}
              placeholder={t('stockMovements.form.referencePlaceholder')}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
          </FormField>

          {/* Actions */}
          {!isViewMode && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                {t('stockMovements.form.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {mode === 'create' ? t('stockMovements.form.createMovement') : t('stockMovements.form.saveChanges')}
              </Button>
            </div>
          )}
        </>
      )}
    </form>
  );
}
