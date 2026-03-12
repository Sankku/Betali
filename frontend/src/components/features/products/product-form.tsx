import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Package, Calendar, Globe, DollarSign, Percent, AlertTriangle, Bell } from 'lucide-react';
import { Input } from '../../ui/input';
import { DatePicker } from '../../ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { TooltipHelp } from '../../ui/tooltip-help';
import { useTaxRates, formatTaxRate } from '../../../hooks/useTaxRates';

import { ProductFormSchemaData } from '../../../validations/productValidation';

export type ProductFormData = ProductFormSchemaData;

export interface ProductFormProps {
  form: UseFormReturn<ProductFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ form, mode, isLoading = false }) => {
  const isViewMode = mode === 'view';
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
        <span className="text-neutral-800">{value || 'Not specified'}</span>
      </div>
    </div>
  );

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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
            label="Product Name"
            value={currentName}
            icon={<Package className="inline h-4 w-4 mr-2" />}
            description="Product identification name"
          />
        ) : (
          <Input
            {...register('name')}
            label="Product Name"
            placeholder="E.g.: Premium Widget"
            icon={<Package className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.name?.message}
            description="Product identification name"
            required
          />
        )}

        {isViewMode ? (
          <ViewField
            label="Price"
            value={`$${currentPrice.toFixed(2)}`}
            icon={<DollarSign className="inline h-4 w-4 mr-2" />}
            description="Product selling price"
          />
        ) : (
          <Input
            {...register('price')}
            type="number"
            step="0.01"
            min="0"
            label="Price"
            placeholder="0.00"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.price?.message}
            description="Product selling price"
            required
          />
        )}

        {/* Tax Rate Selection */}
        {isViewMode ? (
          <ViewField
            label="Tax Rate"
            value={
              currentTaxRateId && taxRates?.data 
                ? (() => {
                    const selectedTaxRate = taxRates.data.find(rate => rate.tax_rate_id === currentTaxRateId);
                    return selectedTaxRate 
                      ? `${selectedTaxRate.name} (${formatTaxRate(selectedTaxRate.rate)})`
                      : 'No tax rate selected';
                  })()
                : 'No tax rate selected'
            }
            icon={<Percent className="inline h-4 w-4 mr-2" />}
            description="Tax rate applied to this product"
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="tax_rate_id" className="text-gray-900 font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Tax Rate
            </Label>
            <Select
              value={currentTaxRateId}
              onValueChange={(value) => setValue('tax_rate_id', value === 'none' ? '' : value)}
              disabled={isLoading || taxRatesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  taxRatesLoading ? "Loading tax rates..." : 
                  "Select tax rate (optional)"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500 italic">No tax rate</span>
                </SelectItem>
                {taxRates?.data && taxRates.data.length > 0 ? (
                  taxRates.data.map((taxRate) => (
                    <SelectItem key={taxRate.tax_rate_id} value={taxRate.tax_rate_id}>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{taxRate.name}</span>
                        <span className="text-sm text-gray-600">
                          {formatTaxRate(taxRate.rate)} • {taxRate.is_inclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  !taxRatesLoading && (
                    <SelectItem value="no-tax-rates" disabled>
                      <span className="text-gray-500 italic">No tax rates configured</span>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.tax_rate_id && (
              <p className="text-sm text-red-600">{errors.tax_rate_id.message}</p>
            )}
            <p className="text-xs text-gray-600">
              Configure tax rates in <a href="/dashboard/taxes" className="text-blue-600 hover:underline">Tax Management</a> section
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isViewMode ? (
            <ViewField
              label="SKU/Batch Number"
              value={currentBatchNumber}
              icon={<Package className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('batch_number')}
              label="SKU/Batch Number"
              placeholder="E.g.: SKU-2024-001"
              icon={<Package className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.batch_number?.message}
              required
            />
          )}
          {isViewMode ? (
            <ViewField
              label="Origin/Source"
              value={currentOriginCountry}
              icon={<Globe className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('origin_country')}
              label="Origin/Source"
              placeholder="E.g.: Local Supplier"
              icon={<Globe className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.origin_country?.message}
              required
            />
          )}
        </div>
        {isViewMode ? (
          <ViewField
            label="Expiry/Best Before Date"
            value={formatDateForDisplay(currentExpirationDate)}
            icon={<Calendar className="inline h-4 w-4 mr-2" />}
          />
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-neutral-800 flex items-center">
              <span className="text-neutral-600 mr-2"><Calendar className="h-4 w-4" /></span>
              Expiry/Best Before Date
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

        {/* Inventory Alerts Configuration */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h4 className="text-md font-semibold text-gray-900">Inventory Alerts</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isViewMode ? (
              <>
                <ViewField
                  label="Minimum Stock"
                  value={String(watch('min_stock') || 0)}
                  icon={<Package className="inline h-4 w-4 mr-2" />}
                  description="Alert when stock falls below this level"
                />
                <ViewField
                  label="Maximum Stock"
                  value={String(watch('max_stock') || 'Not set')}
                  icon={<Package className="inline h-4 w-4 mr-2" />}
                  description="Alert when stock exceeds this level"
                />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min_stock" className="text-gray-900 font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Minimum Stock
                    <TooltipHelp
                      content="Set the minimum stock level. You'll receive an alert when inventory falls below this amount."
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
                    Alert will trigger when stock falls below this level
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_stock" className="text-gray-900 font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Maximum Stock (Optional)
                    <TooltipHelp
                      content="Set the maximum stock level. You'll receive an alert when inventory exceeds this amount."
                      position="right"
                    />
                  </Label>
                  <Input
                    {...register('max_stock')}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Not set"
                    disabled={isLoading}
                    error={errors.max_stock?.message}
                  />
                  <p className="text-xs text-gray-600">
                    Alert will trigger when stock exceeds this level
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
                Enable inventory alerts for this product
              </Label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
