import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Percent, Info, Calculator, Zap } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ModalForm } from '@/components/templates/modal-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { 
  TaxRate, 
  CreateTaxRateData, 
  useCreateTaxRate, 
  useUpdateTaxRate,
  TAX_RATE_PRESETS,
  formatTaxRate,
  calculateTaxAmount,
  calculateTotalWithTax,
  calculateBaseAmount
} from '@/hooks/useTaxRates';

interface TaxRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  taxRate?: TaxRate;
}

interface TaxRateFormData {
  name: string;
  description: string;
  rate: number;
  is_inclusive: boolean;
  is_active: boolean;
}

export function TaxRateModal({ isOpen, onClose, mode, taxRate }: TaxRateModalProps) {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [testAmount, setTestAmount] = useState<number>(100);

  const createTaxRateMutation = useCreateTaxRate();
  const updateTaxRateMutation = useUpdateTaxRate();

  const form = useForm<TaxRateFormData>({
    defaultValues: {
      name: taxRate?.name || '',
      description: taxRate?.description || '',
      rate: taxRate?.rate ? taxRate.rate * 100 : 0, // Convert to percentage for display
      is_inclusive: taxRate?.is_inclusive || false,
      is_active: taxRate?.is_active ?? true
    }
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        reset({
          name: '',
          description: '',
          rate: 0,
          is_inclusive: false,
          is_active: true
        });
        setSelectedPreset('');
      } else if (taxRate && (mode === 'edit' || mode === 'view')) {
        reset({
          name: taxRate.name,
          description: taxRate.description || '',
          rate: taxRate.rate * 100, // Convert to percentage
          is_inclusive: taxRate.is_inclusive,
          is_active: taxRate.is_active
        });
      }
    }
  }, [isOpen, mode, taxRate, reset]);

  const handleSubmit = async (data: TaxRateFormData) => {
    try {
      const taxRateData: CreateTaxRateData = {
        name: data.name,
        description: data.description || undefined,
        rate: data.rate / 100, // Convert percentage back to decimal
        is_inclusive: data.is_inclusive,
        is_active: data.is_active
      };

      if (mode === 'create') {
        await createTaxRateMutation.mutateAsync(taxRateData);
      } else if (mode === 'edit' && taxRate) {
        await updateTaxRateMutation.mutateAsync({
          taxRateId: taxRate.tax_rate_id,
          taxRateData
        });
      }
      onClose();
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handlePresetSelect = (presetName: string) => {
    if (selectedPreset === presetName) {
      // Toggle off
      setValue('name', '');
      setValue('description', '');
      setValue('rate', 0);
      setValue('is_inclusive', false);
      setSelectedPreset('');
      return;
    }

    const preset = TAX_RATE_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setValue('name', preset.name);
      setValue('description', preset.description);
      setValue('rate', preset.rate * 100); // Convert to percentage
      setValue('is_inclusive', preset.is_inclusive);
      setSelectedPreset(presetName);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return t('taxManagement.modal.createTitle');
      case 'edit':
        return t('taxManagement.modal.editTitle');
      case 'view':
        return t('taxManagement.modal.viewTitle', { name: taxRate?.name || '' });
      default:
        return t('taxManagement.modal.defaultTitle');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('taxManagement.modal.createDescription');
      case 'edit':
        return t('taxManagement.modal.editDescription');
      case 'view':
        return t('taxManagement.modal.viewDescription');
      default:
        return '';
    }
  };

  const isSubmitting = createTaxRateMutation.isPending || updateTaxRateMutation.isPending;
  const isViewMode = mode === 'view';

  // Tax calculation preview
  const currentRate = watchedValues.rate / 100;
  const baseAmount = calculateBaseAmount(testAmount, currentRate, watchedValues.is_inclusive);
  const taxAmount = calculateTaxAmount(testAmount, currentRate, watchedValues.is_inclusive);
  const totalWithTax = calculateTotalWithTax(testAmount, currentRate, watchedValues.is_inclusive);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={Percent}
      mode={mode}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-6">
        {/* Quick Presets - Only show in create mode */}
        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                <Zap className="h-4 w-4 text-blue-500" />
                {t('taxManagement.modal.quickPresetsTitle')}
              </CardTitle>
              <CardDescription>
                {t('taxManagement.modal.quickPresetsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TAX_RATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant={selectedPreset === preset.name ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-left h-auto py-2"
                    onClick={() => handlePresetSelect(preset.name)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-xs text-gray-600">
                        {formatTaxRate(preset.rate)} - {preset.is_inclusive ? t('taxManagement.modal.inclusive') : t('taxManagement.modal.exclusive')}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900 font-medium">
              {t('taxManagement.modal.taxNameLabel')}
            </Label>
            <Input
              {...form.register('name', { required: 'Tax name is required' })}
              placeholder={t('taxManagement.modal.taxNamePlaceholder')}
              disabled={isViewMode}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate" className="text-gray-900 font-medium">
              {t('taxManagement.modal.taxRateLabel')}
            </Label>
            <div className="relative">
              <Input
                {...form.register('rate', { 
                  required: 'Tax rate is required',
                  min: { value: 0, message: 'Tax rate cannot be negative' },
                  max: { value: 100, message: 'Tax rate cannot exceed 100%' }
                })}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="21.00"
                disabled={isViewMode}
              />
              <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            {form.formState.errors.rate && (
              <p className="text-sm text-red-600">{form.formState.errors.rate.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-900 font-medium">
            {t('taxManagement.modal.descriptionLabel')}
          </Label>
          <Textarea
            {...form.register('description')}
            placeholder={t('taxManagement.modal.descriptionPlaceholder')}
            rows={3}
            disabled={isViewMode}
          />
        </div>

        {/* Tax Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start space-x-3">
              <Calculator className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">{t('taxManagement.modal.calculationMethodTitle')}</h4>
                <p className="text-sm text-gray-600">
                  {watchedValues.is_inclusive
                    ? t('taxManagement.modal.inclusiveCalcDesc')
                    : t('taxManagement.modal.exclusiveCalcDesc')
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={watchedValues.is_inclusive}
              onCheckedChange={(checked) => setValue('is_inclusive', checked)}
              disabled={isViewMode}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">{t('taxManagement.modal.activeStatusTitle')}</h4>
                <p className="text-sm text-gray-600">
                  {watchedValues.is_active
                    ? t('taxManagement.modal.activeStatusOn')
                    : t('taxManagement.modal.activeStatusOff')
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={watchedValues.is_active}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              disabled={isViewMode}
            />
          </div>
        </div>

        {/* Tax Calculation Preview */}
        {watchedValues.rate > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                <Calculator className="h-4 w-4 text-green-500" />
                {t('taxManagement.modal.previewTitle')}
              </CardTitle>
              <CardDescription>
                {t('taxManagement.modal.previewDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">{t('taxManagement.modal.testAmount')}</Label>
                <Input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-gray-700">
                    {watchedValues.is_inclusive ? t('taxManagement.modal.inputAmount') : t('taxManagement.modal.baseAmount')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${testAmount.toFixed(2)}
                  </p>
                  {watchedValues.is_inclusive && (
                    <p className="text-xs text-gray-600">
                      Base: ${baseAmount.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-700">{t('taxManagement.modal.taxAmount')}</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ${taxAmount.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-700">
                    {watchedValues.is_inclusive ? t('taxManagement.modal.finalPrice') : t('taxManagement.modal.totalWithTax')}
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    ${totalWithTax.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {watchedValues.is_inclusive
                    ? t('taxManagement.modal.inclusiveExplanation', {
                        total: totalWithTax.toFixed(2),
                        tax: taxAmount.toFixed(2),
                        base: baseAmount.toFixed(2),
                      })
                    : t('taxManagement.modal.exclusiveExplanation', {
                        amount: testAmount.toFixed(2),
                        tax: taxAmount.toFixed(2),
                        total: totalWithTax.toFixed(2),
                      })
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModalForm>
  );
}