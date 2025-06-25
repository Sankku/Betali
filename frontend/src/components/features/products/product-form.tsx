import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Package, Calendar, Globe, AlertCircle } from 'lucide-react';
import { Input } from '../../ui/input';

export interface ProductFormData {
  name: string;
  batch_number: string;
  expiry_date: string;
  country_of_origin: string;
}

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
  const currentExpiryDate = watch('expiry_date') || '';
  const currentCountry = watch('country_of_origin') || '';

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
        <span className="text-neutral-800">{value || 'No especificado'}</span>
      </div>
    </div>
  );

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return 'No especificado';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
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
            label="Nombre del Producto"
            value={currentName}
            icon={<Package className="inline h-4 w-4 mr-2" />}
            description="Nombre identificativo del producto"
          />
        ) : (
          <Input
            {...register('name')}
            label="Nombre del Producto"
            placeholder="Ej: Fertilizante NPK"
            icon={<Package className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.name?.message}
            description="Nombre identificativo del producto"
            required
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isViewMode ? (
            <ViewField
              label="Número de Lote"
              value={currentBatchNumber}
              icon={<AlertCircle className="inline h-4 w-4 mr-2" />}
              description="Identificador único del lote"
            />
          ) : (
            <Input
              {...register('batch_number')}
              label="Número de Lote"
              placeholder="Ej: LOT001"
              icon={<AlertCircle className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.batch_number?.message}
              description="Identificador único del lote"
              required
            />
          )}
          {isViewMode ? (
            <ViewField
              label="Fecha de Vencimiento"
              value={formatDateForDisplay(currentExpiryDate)}
              icon={<Calendar className="inline h-4 w-4 mr-2" />}
              description="Fecha límite de consumo"
            />
          ) : (
            <Input
              {...register('expiry_date')}
              type="date"
              label="Fecha de Vencimiento"
              icon={<Calendar className="h-4 w-4" />}
              disabled={isLoading}
              error={errors.expiry_date?.message}
              description="Fecha límite de consumo"
              required
            />
          )}
        </div>
        {isViewMode ? (
          <ViewField
            label="País de Origen"
            value={currentCountry}
            icon={<Globe className="inline h-4 w-4 mr-2" />}
            description="País donde se produjo el producto"
          />
        ) : (
          <Input
            {...register('country_of_origin')}
            label="País de Origen"
            placeholder="Ej: Argentina"
            icon={<Globe className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.country_of_origin?.message}
            description="País donde se produjo el producto"
            required
          />
        )}
      </div>
    </div>
  );
};
