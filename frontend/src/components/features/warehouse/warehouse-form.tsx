import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Warehouse, MapPin } from 'lucide-react';
import { Input } from '../../ui/input';
import { Toggle } from '../../ui/toggle';
import { FormSection } from '../../templates/form-section';
import { useTranslation } from '../../../contexts/LanguageContext';

export interface WarehouseFormData {
  name: string;
  location: string;
  is_active: boolean;
}

export interface WarehouseFormProps {
  form: UseFormReturn<WarehouseFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export const WarehouseForm: React.FC<WarehouseFormProps> = ({ form, mode, isLoading = false }) => {
  const { t } = useTranslation();
  const isViewMode = mode === 'view';
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const currentName = watch('name') || '';
  const currentLocation = watch('location') || '';
  const currentIsActive = watch('is_active') ?? true;

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
        <span className="text-neutral-800">{value || t('warehouse.form.notSpecified')}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isViewMode ? (
          <ViewField
            label={t('warehouse.form.warehouseName')}
            value={currentName}
            icon={<Warehouse className="inline h-4 w-4 mr-2" />}
            description={t('warehouse.form.warehouseNameDesc')}
          />
        ) : (
          <Input
            {...register('name')}
            label={t('warehouse.form.warehouseName')}
            placeholder={t('warehouse.form.warehouseNamePlaceholder')}
            icon={<Warehouse className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.name?.message}
            description={t('warehouse.form.warehouseNameDesc')}
            required
          />
        )}
        {isViewMode ? (
          <ViewField
            label={t('warehouse.form.location')}
            value={currentLocation}
            icon={<MapPin className="inline h-4 w-4 mr-2" />}
            description={t('warehouse.form.locationDesc')}
          />
        ) : (
          <Input
            {...register('location')}
            label={t('warehouse.form.location')}
            placeholder={t('warehouse.form.locationPlaceholder')}
            icon={<MapPin className="h-4 w-4" />}
            disabled={isLoading}
            error={errors.location?.message}
            description={t('warehouse.form.locationDesc')}
            required
          />
        )}
      </div>
      <FormSection title={t('warehouse.form.configuration')} variant="highlighted">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h5 className="text-sm font-medium text-neutral-900 mb-1">{t('warehouse.form.warehouseStatus')}</h5>
            <p className="text-xs text-neutral-600">
              {currentIsActive
                ? t('warehouse.form.activeDesc')
                : t('warehouse.form.inactiveDesc')}
            </p>
          </div>
          {isViewMode ? (
            <div className="ml-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentIsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {currentIsActive ? t('common.active') : t('common.inactive')}
              </span>
            </div>
          ) : (
            <div className="ml-4">
              <Toggle
                checked={currentIsActive}
                onChange={checked => setValue('is_active', checked)}
                disabled={isLoading}
                variant={currentIsActive ? 'success' : 'default'}
              />
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
};
