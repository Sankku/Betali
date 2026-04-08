import React, { useEffect, useState } from 'react';
import { X, Package, Tag, Ruler, AlertTriangle, Bell, FlaskConical, DollarSign } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { ProductFormulaEditor, type LocalFormulaItem } from './ProductFormulaEditor';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { ProductType, ProductTypeFormData } from '../../../services/api/productTypesService';

interface ProductTypeSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductTypeFormData) => Promise<void>;
  productType?: ProductType;
  isLoading?: boolean;
}

const defaultForm: ProductTypeFormData = {
  sku: '',
  name: '',
  product_type: 'standard',
  unit: 'unidad',
  min_stock: undefined,
  max_stock: undefined,
  description: '',
  alert_enabled: false,
  purchase_price: null,
  sale_price: null,
};

export const ProductTypeSidePanel: React.FC<ProductTypeSidePanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productType,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<ProductTypeFormData>(defaultForm);
  const [errors, setErrors] = React.useState<Partial<Record<keyof ProductTypeFormData, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [localFormulaItems, setLocalFormulaItems] = useState<LocalFormulaItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (productType) {
        setForm({
          sku: productType.sku,
          name: productType.name,
          product_type: productType.product_type,
          unit: productType.unit,
          min_stock: productType.min_stock,
          max_stock: productType.max_stock,
          description: productType.description || '',
          alert_enabled: productType.alert_enabled,
          purchase_price: productType.purchase_price ?? null,
          sale_price: productType.sale_price ?? null,
        });
      } else {
        setForm(defaultForm);
        setLocalFormulaItems([]);
      }
      setErrors({});
    }
  }, [isOpen, productType]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductTypeFormData, string>> = {};
    if (!form.sku.trim()) newErrors.sku = t('products.sidePanel.skuRequired');
    if (!form.name.trim()) newErrors.name = t('products.sidePanel.nameRequired');
    if (!form.product_type) newErrors.product_type = t('products.sidePanel.typeRequired');
    if (!form.unit) newErrors.unit = t('products.sidePanel.unitRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      // error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof ProductTypeFormData, value: string | number | boolean | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isProcessing = isLoading || submitting;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900">
              {productType ? t('products.sidePanel.editTitle') : t('products.sidePanel.newTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* SKU */}
            <Input
              label={t('products.sidePanel.skuLabel')}
              name="sku"
              value={form.sku}
              onChange={e => handleChange('sku', e.target.value)}
              placeholder={t('products.sidePanel.skuPlaceholder')}
              icon={<Tag className="h-4 w-4" />}
              disabled={isProcessing}
              error={errors.sku}
              required
            />

            {/* Nombre */}
            <Input
              label={t('products.sidePanel.nameLabel')}
              name="name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder={t('products.sidePanel.namePlaceholder')}
              icon={<Package className="h-4 w-4" />}
              disabled={isProcessing}
              error={errors.name}
              required
            />

            {/* Tipo y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_type" className="text-sm font-semibold text-neutral-800 flex items-center gap-1">
                  <Ruler className="h-4 w-4 text-neutral-600" />
                  {t('products.sidePanel.typeLabel')}
                  <span className="text-danger-500 ml-0.5">*</span>
                </Label>
                <select
                  id="product_type"
                  value={form.product_type}
                  onChange={e => handleChange('product_type', e.target.value as ProductTypeFormData['product_type'])}
                  disabled={isProcessing}
                  className="w-full rounded-lg border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                >
                  <option value="standard">{t('products.sidePanel.typeStandard')}</option>
                  <option value="raw_material">{t('products.sidePanel.typeRawMaterial')}</option>
                  <option value="finished_good">{t('products.sidePanel.typeFinishedGood')}</option>
                </select>
                {errors.product_type && (
                  <p className="text-sm text-danger-600 font-medium">{errors.product_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-semibold text-neutral-800">
                  {t('products.sidePanel.unitLabel')}
                  <span className="text-danger-500 ml-0.5">*</span>
                </Label>
                <select
                  id="unit"
                  value={form.unit}
                  onChange={e => handleChange('unit', e.target.value as ProductTypeFormData['unit'])}
                  disabled={isProcessing}
                  className="w-full rounded-lg border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
                >
                  <option value="unidad">{t('products.sidePanel.unitUnit')}</option>
                  <option value="kg">{t('products.sidePanel.unitKg')}</option>
                  <option value="g">{t('products.sidePanel.unitG')}</option>
                  <option value="mg">{t('products.sidePanel.unitMg')}</option>
                  <option value="l">{t('products.sidePanel.unitL')}</option>
                  <option value="ml">{t('products.sidePanel.unitMl')}</option>
                  <option value="docena">{t('products.sidePanel.unitDocena')}</option>
                </select>
                {errors.unit && (
                  <p className="text-sm text-danger-600 font-medium">{errors.unit}</p>
                )}
              </div>
            </div>

            {/* Descripcion */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-neutral-800">
                {t('products.sidePanel.descLabel')}
              </Label>
              <textarea
                id="description"
                value={form.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                placeholder={t('products.sidePanel.descPlaceholder')}
                disabled={isProcessing}
                rows={3}
                className="w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 resize-none"
              />
            </div>

            {/* Formula BOM — only for finished goods */}
            {form.product_type === 'finished_good' && (
              <div className="border-t pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-purple-500" />
                  <h3 className="text-sm font-semibold text-neutral-800">{t('products.sidePanel.formulaTitle')}</h3>
                </div>
                <ProductFormulaEditor
                  finishedProductTypeId={productType?.product_type_id}
                  mode={productType ? 'edit' : 'create'}
                  localItems={localFormulaItems}
                  setLocalItems={setLocalFormulaItems}
                />
              </div>
            )}

            {/* Precios de referencia */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('products.sidePanel.salePriceLabel')}
                name="sale_price"
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price ?? ''}
                onChange={e =>
                  handleChange('sale_price', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="0.00"
                icon={<DollarSign className="h-4 w-4" />}
                disabled={isProcessing}
              />
              <Input
                label={t('products.sidePanel.purchasePriceLabel')}
                name="purchase_price"
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price ?? ''}
                onChange={e =>
                  handleChange('purchase_price', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="0.00"
                icon={<DollarSign className="h-4 w-4" />}
                disabled={isProcessing}
              />
            </div>

            {/* Alertas de inventario */}
            <div className="border-t pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-semibold text-neutral-800">{t('products.sidePanel.alertsTitle')}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('products.sidePanel.minStockLabel')}
                  name="min_stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.min_stock ?? ''}
                  onChange={e =>
                    handleChange('min_stock', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                  disabled={isProcessing}
                />
                <Input
                  label={t('products.sidePanel.maxStockLabel')}
                  name="max_stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.max_stock ?? ''}
                  onChange={e =>
                    handleChange('max_stock', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder={t('products.sidePanel.maxStockPlaceholder')}
                  disabled={isProcessing}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="alert_enabled"
                  checked={form.alert_enabled ?? false}
                  onChange={e => handleChange('alert_enabled', e.target.checked)}
                  disabled={isProcessing}
                  className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <Label htmlFor="alert_enabled" className="text-sm font-medium text-neutral-700 flex items-center gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  {t('products.sidePanel.enableAlerts')}
                </Label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 flex gap-3 justify-end bg-neutral-50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              {t('products.sidePanel.cancel')}
            </Button>
            <Button type="submit" loading={isProcessing}>
              {productType ? t('products.sidePanel.saveChanges') : t('products.sidePanel.createProduct')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
