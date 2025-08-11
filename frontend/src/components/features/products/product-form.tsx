import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Package, Calendar, Globe } from 'lucide-react';
import { Input } from '../../ui/input';

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
    formState: { errors },
  } = form;

  const currentName = watch('name') || '';
  const currentBatchNumber = watch('batch_number') || '';
  const currentExpirationDate = watch('expiration_date') || '';
  const currentOriginCountry = watch('origin_country') || '';

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
            placeholder="E.g.: NPK Fertilizer"
            icon={<Package className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.name?.message}
            description="Product identification name"
            required
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isViewMode ? (
            <ViewField
              label="Batch Number"
              value={currentBatchNumber}
              icon={<Package className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('batch_number')}
              label="Batch Number"
              placeholder="E.g.: LT-2024-001"
              icon={<Package className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.batch_number?.message}
              required
            />
          )}
          {isViewMode ? (
            <ViewField
              label="Country of Origin"
              value={currentOriginCountry}
              icon={<Globe className="inline h-4 w-4 mr-2" />}
            />
          ) : (
            <Input
              {...register('origin_country')}
              label="Country of Origin"
              placeholder="E.g.: Argentina"
              icon={<Globe className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.origin_country?.message}
              required
            />
          )}
        </div>
        {isViewMode ? (
          <ViewField
            label="Expiration Date"
            value={formatDateForDisplay(currentExpirationDate)}
            icon={<Calendar className="inline h-4 w-4 mr-2" />}
          />
        ) : (
          <Input
            {...register('expiration_date')}
            type="date"
            label="Expiration Date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.expiration_date?.message}
            required
          />
        )}
      </div>
    </div>
  );
};
