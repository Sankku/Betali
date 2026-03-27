import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Package, BarChart2 } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { ProductForm, ProductFormData } from './product-form';
import { ProductFormulaEditor, LocalFormulaItem } from './ProductFormulaEditor';
import { ProductStockBreakdown } from './ProductStockBreakdown';
import { useAddFormulaItem } from '../../../hooks/useProductFormula';
import { productFormSchema } from '../../../validations/productValidation';
import { useTranslation } from '../../../contexts/LanguageContext';

export interface Product {
  product_id: string;
  name: string;
  batch_number: string;
  expiration_date: string;
  origin_country: string;
  created_at: string;
  updated_at?: string;
  owner_id?: string;
  description?: string;
  external_product_id?: string;
  price?: number;
  sku?: string;
  product_type?: 'standard' | 'raw_material' | 'finished_good';
  unit?: string;
}

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
  onSubmit: (data: ProductFormData) => Promise<void | Product | undefined>;
  isLoading?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  mode,
  product,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [localFormulaItems, setLocalFormulaItems] = React.useState<LocalFormulaItem[]>([]);
  const addItem = useAddFormulaItem();
  const form = useForm<ProductFormData>({
    resolver: yupResolver(productFormSchema),
    defaultValues: {
      name: product?.name || '',
      batch_number: product?.batch_number || '',
      expiration_date: product?.expiration_date || '',
      origin_country: product?.origin_country || '',
      description: product?.description || '',
      external_product_id: product?.external_product_id || '',
      price: product?.price || 0,
      min_stock: 0,
      max_stock: undefined,
      alert_enabled: true,
      tax_rate_id: '',
      product_type: product?.product_type || 'standard',
      unit: product?.unit || 'unidad',
    },
  });

  const productType = form.watch('product_type');

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return t('products.modal.createTitle');
      case 'edit':
        return t('products.modal.editTitle', { name: product?.name });
      case 'view':
        return t('products.modal.viewTitle', { name: product?.name });
      default:
        return t('nav.products');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('products.modal.createDescription');
      case 'edit':
        return t('products.modal.editDescription', { name: product?.name });
      case 'view':
        return t('products.modal.viewDescription', { name: product?.name });
      default:
        return '';
    }
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      const result = await onSubmit(data);

      if (mode === 'create' && data.product_type === 'finished_good' && result && (result as Product).product_id) {
        if (localFormulaItems.length > 0) {
          await Promise.all(localFormulaItems.map(item =>
            addItem.mutateAsync({
              finished_product_id: (result as Product).product_id,
              raw_material_id: item.raw_material_id,
              quantity_required: item.quantity_required,
            })
          ));
        }
      }

      if (mode === 'create' && data.product_type !== 'finished_good') {
        form.reset();
        setLocalFormulaItems([]);
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409 || err.message?.includes('batch number already exists')) {
        form.setError('batch_number', {
          type: 'manual',
          message: t('products.form.skuDuplicateError'),
        });
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        setLocalFormulaItems([]);
        form.reset({
          name: '',
          batch_number: '',
          origin_country: '',
          expiration_date: '',
          description: '',
          external_product_id: '',
          price: 0,
          min_stock: 0,
          max_stock: undefined,
          alert_enabled: true,
          tax_rate_id: '',
          product_type: 'standard',
          unit: 'unidad',
        });
      } else if (product && (mode === 'edit' || mode === 'view')) {
        form.reset({
          name: product.name || '',
          batch_number: product.batch_number || '',
          origin_country: product.origin_country || '',
          expiration_date: product.expiration_date || '',
          description: product.description || '',
          external_product_id: product.external_product_id || '',
          price: product.price || 0,
          product_type: product.product_type || 'standard',
          unit: product.unit || 'unidad',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, product]);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={Package}
      mode={mode}
      isLoading={isLoading}
      size="lg"
    >
      <ProductForm form={form} mode={mode} isLoading={isLoading} />
      {productType === 'finished_good' && (
        <div className="mt-4 border-t pt-4">
          <ProductFormulaEditor
            finishedProductId={product?.product_id}
            mode={mode}
            localItems={localFormulaItems}
            setLocalItems={setLocalFormulaItems}
          />
        </div>
      )}
      {/* Stock by warehouse — only in view/edit mode when product exists */}
      {mode !== 'create' && product?.product_id && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4 text-neutral-600" />
            <h4 className="text-sm font-semibold text-neutral-800">Stock por depósito</h4>
          </div>
          <ProductStockBreakdown productId={product.product_id} unit={form.getValues('unit')} />
        </div>
      )}
    </ModalForm>
  );
};
