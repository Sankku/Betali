import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Package, Calendar, Globe, DollarSign, Percent, AlertTriangle, Bell } from 'lucide-react';
import { Input } from '../../ui/input';
import { DatePicker } from '../../ui/date-picker';
import { Label } from '../../ui/label';
import { TooltipHelp } from '../../ui/tooltip-help';
import { useTaxRates, formatTaxRate } from '../../../hooks/useTaxRates';
import { useTranslation } from '../../../contexts/LanguageContext';

import { ProductFormSchemaData } from '../../../validations/productValidation';

export type ProductFormData = ProductFormSchemaData;

export interface ProductFormProps {
  form: UseFormReturn<ProductFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ form, mode, isLoading = false }) => {
  const isViewMode = mode === 'view';
  const { t } = useTranslation();
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Load tax rates
  const { data: taxRates, isLoading: taxRatesLoading } = useTaxRates({ active_only: true });

  const currentName = watch('name') || '';
  const currentBatchNumber = watch('batch_number') || '';
  const currentExpirationDate = watch('expiration_date') || '';
  const currentOriginCountry = watch('origin_country') || '';
  const currentPrice = watch('price') || 0;
  const currentTaxRateId = watch('tax_rate_id') || '';

  const ViewField: React.FC<{
    label: string;
    value: string;
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
        <span className="text-neutral-800">{value || t('products.form.notSpecified')}</span>
      </div>
    </div>
  );

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return t('products.form.notSpecified');
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {isViewMode ? (
          <ViewField
            label={t('products.form.productName')}
            value={currentName}
            icon={<Package className="inline h-4 w-4 mr-2" />}
            description={t('products.form.productNameDesc')}
          />
        ) : (
          <Input
            {...register('name')}
            label={t('products.form.productName')}
            placeholder={t('products.form.productNamePlaceholder')}
            icon={<Package className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.name?.message}
            description={t('products.form.productNameDesc')}
            required
          />
        )}

        {isViewMode ? (
          <ViewField
            label={t('products.form.price')}
            value={`$${currentPrice.toFixed(2)}`}
            icon={<DollarSign className="inline h-4 w-4 mr-2" />}
            description={t('products.form.priceDesc')}
          />
        ) : (
          <Input
            {...register('price')}
            type="number"
            step="0.01"
            min="0"
            label={t('products.form.price')}
            placeholder="0.00"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.price?.message}
            description={t('products.form.priceDesc')}
            required
          />
        )}

        {/* Tax Rate Selection */}
        {isViewMode ? (
          <ViewField
            label={t('products.form.taxRate')}
            value={
              currentTaxRateId && taxRates?.data
                ? (() => {
                    const selectedTaxRate = taxRates.data.find(rate => rate.tax_rate_id === currentTaxRateId);
                    return selectedTaxRate
                      ? `${selectedTaxRate.name} (${formatTaxRate(selectedTaxRate.rate)})`
                      : t('products.form.noTaxRate');
                  })()
                : t('products.form.noTaxRate')
            }
            icon={<Percent className="inline h-4 w-4 mr-2" />}
            description={t('products.form.taxRateDesc')}
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="tax_rate_id" className="text-gray-900 font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              {t('products.form.taxRate')}
            </Label>
            <select
              id="tax_rate_id"
              value={currentTaxRateId || ''}
              onChange={(e) => setValue('tax_rate_id', e.target.value, { shouldValidate: true })}
              disabled={isLoading || taxRatesLoading}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            >
              <option value="">
                {taxRatesLoading ? t('products.form.taxRateLoading') : t('products.form.taxRatePlaceholder')}
              </option>
              {taxRates?.data && taxRates.data.map((taxRate) => (
                <option key={taxRate.tax_rate_id} value={taxRate.tax_rate_id}>
                  {taxRate.name} ({formatTaxRate(taxRate.rate)} • {taxRate.is_inclusive ? t('products.form.taxInclusive') : t('products.form.taxExclusive')})
                </option>
              ))}
            </select>
            {errors.tax_rate_id && (
              <p className="text-sm text-red-600">{errors.tax_rate_id.message}</p>
            )}
            <p className="text-xs text-gray-600">
              {t('products.form.taxRateNotePrefix')} <a href="/dashboard/taxes" className="text-blue-600 hover:underline">{t('products.form.taxManagementLink')}</a>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isViewMode ? (
            <ViewField
              label={t('products.form.sku')}
              value={currentBatchNumber}
              icon={<Package className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('batch_number')}
              label={t('products.form.sku')}
              placeholder={t('products.form.skuPlaceholder')}
              icon={<Package className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.batch_number?.message}
              required
            />
          )}
          {isViewMode ? (
            <ViewField
              label={t('products.form.origin')}
              value={currentOriginCountry}
              icon={<Globe className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('origin_country')}
              label={t('products.form.origin')}
              placeholder={t('products.form.originPlaceholder')}
              icon={<Globe className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.origin_country?.message}
              required
            />
          )}
        </div>
        {isViewMode ? (
          <ViewField
            label={t('products.form.expiryDate')}
            value={formatDateForDisplay(currentExpirationDate)}
            icon={<Calendar className="inline h-4 w-4 mr-2" />}
          />
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-neutral-800 flex items-center">
              <span className="text-neutral-600 mr-2"><Calendar className="h-4 w-4" /></span>
              {t('products.form.expiryDate')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <DatePicker
              value={watch('expiration_date') ? new Date(`${watch('expiration_date')}T00:00:00`) : undefined}
              onChange={(date) => {
                setValue('expiration_date', date ? date.toISOString().split('T')[0] : '', { shouldValidate: true });
              }}
              disabled={isLoading}
              className={`w-full h-[48px] rounded-lg border-2 border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm ${errors.expiration_date ? 'border-red-500' : ''}`}
            />
            {errors.expiration_date?.message && <p className="text-sm text-red-600 font-medium">{errors.expiration_date.message}</p>}
          </div>
        )}

        {/* Product type */}
        <div className="space-y-2">
          <Label htmlFor="product_type">Tipo de producto</Label>
          <select
            id="product_type"
            disabled={isViewMode}
            {...register('product_type')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="standard">Estándar</option>
            <option value="raw_material">Materia prima</option>
            <option value="finished_good">Producto terminado (BOM)</option>
          </select>
        </div>

        {/* Inventory Alerts Configuration */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h4 className="text-md font-semibold text-gray-900">{t('products.form.inventoryAlerts')}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isViewMode ? (
              <>
                <ViewField
                  label={t('products.form.minStock')}
                  value={String(watch('min_stock') || 0)}
                  icon={<Package className="inline h-4 w-4 mr-2" />}
                  description={t('products.form.minStockDesc')}
                />
                <ViewField
                  label={t('products.form.maxStock')}
                  value={String(watch('max_stock') || t('products.form.notSet'))}
                  icon={<Package className="inline h-4 w-4 mr-2" />}
                  description={t('products.form.maxStockDesc')}
                />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min_stock" className="text-gray-900 font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('products.form.minStock')}
                    <TooltipHelp
                      content={t('products.form.minStockTooltip')}
                      position="right"
                    />
                  </Label>
                  <Input
                    {...register('min_stock')}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    disabled={isLoading}
                    error={errors.min_stock?.message}
                  />
                  <p className="text-xs text-gray-600">
                    {t('products.form.minStockDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_stock" className="text-gray-900 font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('products.form.maxStock')}
                    <TooltipHelp
                      content={t('products.form.maxStockTooltip')}
                      position="right"
                    />
                  </Label>
                  <Input
                    {...register('max_stock')}
                    type="number"
                    min="0"
                    step="1"
                    placeholder={t('products.form.notSet')}
                    disabled={isLoading}
                    error={errors.max_stock?.message}
                  />
                  <p className="text-xs text-gray-600">
                    {t('products.form.maxStockDesc')}
                  </p>
                </div>
              </>
            )}
          </div>

          {!isViewMode && (
            <div className="mt-4 flex items-center gap-3">
              <input
                {...register('alert_enabled')}
                type="checkbox"
                id="alert_enabled"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <Label htmlFor="alert_enabled" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('products.form.enableAlerts')}
              </Label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
