import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Package } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { ProductForm, ProductFormData } from './product-form';
import { ProductFormulaEditor } from './ProductFormulaEditor';
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
}

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
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
      await onSubmit(data);
      if (mode === 'create') {
        form.reset();
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
      {mode === 'edit' && productType === 'finished_good' && product?.product_id && (
        <div className="mt-4 border-t pt-4">
          <ProductFormulaEditor finishedProductId={product.product_id} />
        </div>
      )}
    </ModalForm>
  );
};
