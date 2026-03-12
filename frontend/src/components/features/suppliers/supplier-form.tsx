import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSelect } from '@/components/ui/form-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, Mail, Phone, MapPin, Globe, CreditCard, Star } from 'lucide-react';
import { supplierService, type Supplier, type CreateSupplierData } from '@/services/api/supplierService';

// Enhanced validation schema with CUIT checksum validation
const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  email: z.string().email('Email inválido'),
  cuit: z.string()
    .min(1, 'El CUIT es requerido')
    .refine((cuit) => {
      const cleaned = cuit.replace(/\D/g, '');
      return cleaned.length === 11;
    }, 'El CUIT debe tener 11 dígitos')
    .refine((cuit) => {
      const cleaned = cuit.replace(/\D/g, '');
      if (cleaned.length !== 11) return false;
      
      // CUIT validation algorithm
      const digits = cleaned.split('').map(Number);
      const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += digits[i] * multipliers[i];
      }
      
      const checkDigit = 11 - (sum % 11);
      const finalCheckDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
      
      return finalCheckDigit === digits[10];
    }, 'El CUIT ingresado no es válido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  business_type: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  payment_terms: z.string().optional(),
  tax_category: z.string().optional(),
  credit_limit: z.coerce.number().min(0, 'El límite de crédito no puede ser negativo').optional(),
  is_preferred: z.boolean().default(false),
  notes: z.string().optional()
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: CreateSupplierData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

export function SupplierForm({ 
  supplier, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  mode = 'create'
}: SupplierFormProps) {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      email: '',
      cuit: '',
      phone: '',
      address: '',
      business_type: '',
      contact_person: '',
      website: '',
      payment_terms: '',
      tax_category: '',
      credit_limit: 0,
      is_preferred: false,
      notes: ''
    }
  });

  // Load supplier data for edit/view mode
  useEffect(() => {
    if (supplier && (isEditMode || isViewMode)) {
      // Find matching options robustly (handling potential case differences)
      const businessTypeOptions = supplierService.getBusinessTypeOptions();
      const paymentTermsOptions = supplierService.getPaymentTermsOptions();

      const findMatchingOption = (value: string | undefined | null, options: { value: string; label: string }[]) => {
        if (!value) return '';
        // 1. Try exact value match
        const exactMatch = options.find(o => o.value === value);
        if (exactMatch) return exactMatch.value;
        
        // 2. Try case-insensitive value match
        const caseInsensitiveMatch = options.find(o => o.value.toLowerCase() === value.toLowerCase());
        if (caseInsensitiveMatch) return caseInsensitiveMatch.value;

        // 3. Try matching against the label (e.g. backend returns "Fabricante" but value is "Manufacturer")
        const labelMatch = options.find(o => o.label.toLowerCase() === value.toLowerCase());
        if (labelMatch) return labelMatch.value;

        // 4. Return original value as fallback (though it likely won't show if not in options)
        return value;
      };

      reset({
        name: supplier.name || '',
        email: supplier.email || '',
        cuit: supplier.cuit || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        business_type: findMatchingOption(supplier.business_type, businessTypeOptions),
        contact_person: supplier.contact_person || '',
        website: supplier.website || '',
        payment_terms: findMatchingOption(supplier.payment_terms, paymentTermsOptions),
        tax_category: supplier.tax_category || '',
        credit_limit: supplier.credit_limit || 0,
        is_preferred: supplier.is_preferred || false,
        notes: supplier.notes || ''
      });
    }
  }, [supplier, isEditMode, isViewMode, reset]);

  // Handle CUIT formatting
  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = supplierService.formatCuit(value);
    setValue('cuit', formatted);
  };

  // Handle form submission
  const onSubmitHandler = (data: SupplierFormData) => {
    const submissionData: CreateSupplierData = {
      ...data,
      cuit: supplierService.cleanCuit(data.cuit),
      credit_limit: data.credit_limit || undefined,
      website: data.website || undefined,
    };
    onSubmit(submissionData);
  };

  // Business type options
  const businessTypeOptions = supplierService.getBusinessTypeOptions();
  const paymentTermsOptions = supplierService.getPaymentTermsOptions();

  // Watch values for display
  const watchedIsPreferred = watch('is_preferred');

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-8">
      {/* Basic Information Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-neutral-600" />
            Información Básica
            {watchedIsPreferred && (
              <Star className="ml-2 h-4 w-4 text-yellow-400 fill-current" />
            )}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">Información principal del proveedor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            {...register('name')}
            label="Nombre del Proveedor"
            placeholder="Ingrese el nombre del proveedor"
            icon={<Building className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.name?.message}
            description="Nombre completo de la empresa proveedora"
            required
          />

          <FormSelect
            label="Tipo de Negocio"
            value={watch('business_type') || ''}
            onValueChange={(value) => setValue('business_type', value)}
            options={businessTypeOptions}
            icon={<Building className="h-4 w-4" />}
            description="Categoría del negocio del proveedor"
            placeholder="Seleccionar tipo de negocio"
            disabled={isViewMode || isLoading}
          />

          <Input
            {...register('cuit')}
            label="CUIT"
            placeholder="XX-XXXXXXXX-X"
            maxLength={13}
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.cuit?.message}
            description="Código Único de Identificación Tributaria"
            required
            onChange={handleCuitChange}
          />

          <Input
            {...register('contact_person')}
            label="Persona de Contacto"
            placeholder="Nombre del contacto principal"
            icon={<Building className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description="Persona responsable de contacto"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Star className="h-4 w-4 mr-2 text-neutral-600" />
            Preferencias
          </label>
          <p className="text-xs text-neutral-600">Configuraciones especiales del proveedor</p>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_preferred"
              checked={watchedIsPreferred}
              onCheckedChange={(checked) => setValue('is_preferred', checked as boolean)}
              disabled={isViewMode || isLoading}
            />
            <label htmlFor="is_preferred" className="text-sm text-neutral-700 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Marcar como proveedor preferido
            </label>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-neutral-600" />
            Información de Contacto
          </h3>
          <p className="text-sm text-neutral-600 mt-1">Datos de comunicación del proveedor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            {...register('email')}
            label="Email"
            type="email"
            placeholder="proveedor@empresa.com"
            icon={<Mail className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.email?.message}
            description="Dirección de correo electrónico principal"
            required
          />

          <Input
            {...register('phone')}
            label="Teléfono"
            placeholder="+54 11 4567-8900"
            icon={<Phone className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description="Número de teléfono de contacto"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-neutral-600" />
            Dirección
          </label>
          <p className="text-xs text-neutral-600">Dirección completa del proveedor</p>
          <Textarea
            {...register('address')}
            placeholder="Calle, número, ciudad, provincia..."
            disabled={isViewMode || isLoading}
            rows={3}
            className="resize-none"
          />
        </div>

        <Input
          {...register('website')}
          label="Sitio Web"
          placeholder="https://ejemplo.com"
          icon={<Globe className="h-4 w-4" />}
          disabled={isViewMode || isLoading}
          error={errors.website?.message}
          description="URL del sitio web corporativo (opcional)"
        />
      </div>

      {/* Financial Information Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-neutral-600" />
            Información Financiera
          </h3>
          <p className="text-sm text-neutral-600 mt-1">Configuraciones de pago y crédito</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormSelect
            label="Términos de Pago"
            value={watch('payment_terms') || ''}
            onValueChange={(value) => setValue('payment_terms', value)}
            options={paymentTermsOptions}
            icon={<CreditCard className="h-4 w-4" />}
            description="Condiciones de pago acordadas"
            placeholder="Seleccionar términos"
            disabled={isViewMode || isLoading}
          />

          <Input
            {...register('tax_category')}
            label="Categoría Fiscal"
            placeholder="Ej: Responsable Inscripto"
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description="Situación tributaria del proveedor"
          />

          <Input
            {...register('credit_limit')}
            label="Límite de Crédito"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.credit_limit?.message}
            description="Límite máximo de crédito en pesos"
          />
        </div>
      </div>

      {/* Additional Notes Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-neutral-600" />
            Información Adicional
          </h3>
          <p className="text-sm text-neutral-600 mt-1">Notas y observaciones especiales</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Building className="h-4 w-4 mr-2 text-neutral-600" />
            Notas y Observaciones
          </label>
          <p className="text-xs text-neutral-600">Información adicional sobre el proveedor (opcional)</p>
          <Textarea
            {...register('notes')}
            placeholder="Información adicional, términos especiales, observaciones..."
            disabled={isViewMode || isLoading}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      {!isViewMode && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              disabled={isLoading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isCreateMode ? 'Crear Proveedor' : 'Actualizar Proveedor'}
          </button>
        </div>
      )}
    </form>
  );
}