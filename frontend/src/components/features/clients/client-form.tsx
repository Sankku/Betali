import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Users, Mail, Building, Phone, MapPin, FileText } from 'lucide-react';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { ClientFormData } from './client-modal';
import { clientService } from '../../../services/api/clientService';

export interface ClientFormProps {
  form: UseFormReturn<ClientFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ form, mode, isLoading = false }) => {
  const isViewMode = mode === 'view';
  const isEditing = mode === 'edit';
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const currentName = watch('name') || '';
  const currentEmail = watch('email') || '';
  const currentCuit = watch('cuit') || '';
  const currentPhone = watch('phone') || '';
  const currentAddress = watch('address') || '';

  // Format CUIT as user types
  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const formatted = clientService.formatCuit(value);
    setValue('cuit', formatted);
  };

  const ViewField: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
  }> = ({ label, value, icon, description }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      {description && <p className="text-xs text-neutral-500">{description}</p>}
      <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
        <span className="text-neutral-800">{value || 'No especificado'}</span>
      </div>
    </div>
  );

  if (isViewMode) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label="Nombre/Razón Social"
            value={currentName}
            icon={<Building className="w-4 h-4" />}
          />
          <ViewField
            label="CUIT"
            value={currentCuit}
            icon={<FileText className="w-4 h-4" />}
            description="Código Único de Identificación Tributaria"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label="Email"
            value={currentEmail}
            icon={<Mail className="w-4 h-4" />}
          />
          <ViewField
            label="Teléfono"
            value={currentPhone}
            icon={<Phone className="w-4 h-4" />}
          />
        </div>

        <ViewField
          label="Dirección"
          value={currentAddress}
          icon={<MapPin className="w-4 h-4" />}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Este cliente está asociado a su organización actual. 
            Los datos fiscales son utilizados para la generación de facturas y reportes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Nombre/Razón Social *
          </label>
          <Input
            id="name"
            placeholder="Ingrese el nombre o razón social"
            {...register('name')}
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="cuit" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            CUIT *
          </label>
          <Input
            id="cuit"
            placeholder="XX-XXXXXXXX-X"
            value={currentCuit}
            onChange={handleCuitChange}
            disabled={isLoading}
            className={errors.cuit ? 'border-red-500' : ''}
            maxLength={13}
          />
          {errors.cuit && (
            <p className="text-xs text-red-500">{errors.cuit.message}</p>
          )}
          <p className="text-xs text-neutral-500">
            Formato: 11 dígitos (se formatea automáticamente)
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email *
          </label>
          <Input
            id="email"
            type="email"
            placeholder="cliente@empresa.com"
            {...register('email')}
            disabled={isLoading}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Teléfono
          </label>
          <Input
            id="phone"
            placeholder="+54 11 1234-5678"
            {...register('phone')}
            disabled={isLoading}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Dirección
        </label>
        <Textarea
          id="address"
          placeholder="Ingrese la dirección completa"
          {...register('address')}
          disabled={isLoading}
          className={errors.address ? 'border-red-500' : ''}
          rows={3}
        />
        {errors.address && (
          <p className="text-xs text-red-500">{errors.address.message}</p>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">Información Fiscal</h4>
            <p className="text-sm text-amber-700">
              El CUIT es requerido para la facturación electrónica y cumplimiento fiscal. 
              Asegúrese de que los datos coincidan con los registros de AFIP.
            </p>
          </div>
        </div>
      </div>

      {/* Required Fields Notice */}
      <div className="text-xs text-neutral-500">
        * Campos requeridos
      </div>
    </div>
  );
};