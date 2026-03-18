import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from '@/contexts/LanguageContext';
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
  const { t } = useTranslation();
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
            {t('suppliers.form.basicInfoTitle')}
            {watchedIsPreferred && (
              <Star className="ml-2 h-4 w-4 text-yellow-400 fill-current" />
            )}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">{t('suppliers.form.basicInfoDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            {...register('name')}
            label={t('suppliers.form.nameLabel')}
            placeholder={t('suppliers.form.namePlaceholder')}
            icon={<Building className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.name?.message}
            description={t('suppliers.form.nameDesc')}
            required
          />

          <FormSelect
            label={t('suppliers.form.businessType')}
            value={watch('business_type') || ''}
            onValueChange={(value) => setValue('business_type', value)}
            options={businessTypeOptions}
            icon={<Building className="h-4 w-4" />}
            description={t('suppliers.form.businessTypeDesc')}
            placeholder={t('suppliers.form.businessTypePlaceholder')}
            disabled={isViewMode || isLoading}
          />

          <Input
            {...register('cuit')}
            label={t('suppliers.form.cuit')}
            placeholder="XX-XXXXXXXX-X"
            maxLength={13}
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.cuit?.message}
            description={t('suppliers.form.cuitDesc')}
            required
            onChange={handleCuitChange}
          />

          <Input
            {...register('contact_person')}
            label={t('suppliers.form.contactPerson')}
            placeholder={t('suppliers.form.contactPersonPlaceholder')}
            icon={<Building className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description={t('suppliers.form.contactPersonDesc')}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Star className="h-4 w-4 mr-2 text-neutral-600" />
            {t('suppliers.form.preferencesTitle')}
          </label>
          <p className="text-xs text-neutral-600">{t('suppliers.form.preferencesDesc')}</p>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="is_preferred"
              checked={watchedIsPreferred}
              onCheckedChange={(checked) => setValue('is_preferred', checked as boolean)}
              disabled={isViewMode || isLoading}
            />
            <label htmlFor="is_preferred" className="text-sm text-neutral-700 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              {t('suppliers.form.markPreferred')}
            </label>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-neutral-600" />
            {t('suppliers.form.contactInfoTitle')}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">{t('suppliers.form.contactInfoDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            {...register('email')}
            label={t('suppliers.form.emailLabel')}
            type="email"
            placeholder={t('suppliers.form.emailPlaceholder')}
            icon={<Mail className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.email?.message}
            description={t('suppliers.form.emailDesc')}
            required
          />

          <Input
            {...register('phone')}
            label={t('suppliers.form.phoneLabel')}
            placeholder={t('suppliers.form.phonePlaceholder')}
            icon={<Phone className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description={t('suppliers.form.phoneDesc')}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-neutral-600" />
            {t('suppliers.form.addressLabel')}
          </label>
          <p className="text-xs text-neutral-600">{t('suppliers.form.addressDesc')}</p>
          <Textarea
            {...register('address')}
            placeholder={t('suppliers.form.addressPlaceholder')}
            disabled={isViewMode || isLoading}
            rows={3}
            className="resize-none"
          />
        </div>

        <Input
          {...register('website')}
          label={t('suppliers.form.websiteLabel')}
          placeholder={t('suppliers.form.websitePlaceholder')}
          icon={<Globe className="h-4 w-4" />}
          disabled={isViewMode || isLoading}
          error={errors.website?.message}
          description={t('suppliers.form.websiteDesc')}
        />
      </div>

      {/* Financial Information Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-neutral-600" />
            {t('suppliers.form.financialInfoTitle')}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">{t('suppliers.form.financialInfoDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormSelect
            label={t('suppliers.form.paymentTerms')}
            value={watch('payment_terms') || ''}
            onValueChange={(value) => setValue('payment_terms', value)}
            options={paymentTermsOptions}
            icon={<CreditCard className="h-4 w-4" />}
            description={t('suppliers.form.paymentTermsDesc')}
            placeholder={t('suppliers.form.paymentTermsPlaceholder')}
            disabled={isViewMode || isLoading}
          />

          <Input
            {...register('tax_category')}
            label={t('suppliers.form.taxCategory')}
            placeholder={t('suppliers.form.taxCategoryPlaceholder')}
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            description={t('suppliers.form.taxCategoryDesc')}
          />

          <Input
            {...register('credit_limit')}
            label={t('suppliers.form.creditLimit')}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon={<CreditCard className="h-4 w-4" />}
            disabled={isViewMode || isLoading}
            error={errors.credit_limit?.message}
            description={t('suppliers.form.creditLimitDesc')}
          />
        </div>
      </div>

      {/* Additional Notes Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-neutral-600" />
            {t('suppliers.form.additionalInfoTitle')}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">{t('suppliers.form.additionalInfoDesc')}</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-800 flex items-center">
            <Building className="h-4 w-4 mr-2 text-neutral-600" />
            {t('suppliers.form.notesTitle')}
          </label>
          <p className="text-xs text-neutral-600">{t('suppliers.form.notesDesc')}</p>
          <Textarea
            {...register('notes')}
            placeholder={t('suppliers.form.notesPlaceholder')}
            disabled={isViewMode || isLoading}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      {!isViewMode && (
        <div className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4 border-t border-neutral-200">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('suppliers.form.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('suppliers.form.saving') : isCreateMode ? t('suppliers.form.create') : t('suppliers.form.update')}
          </Button>
        </div>
      )}
    </form>
  );
}