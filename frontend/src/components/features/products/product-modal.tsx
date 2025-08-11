import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Package } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { ProductForm, ProductFormData } from './product-form';
import { productFormSchema } from '../../../validations/productValidation';

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
  senasa_product_id?: string;
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
  const form = useForm<ProductFormData>({
    resolver: yupResolver(productFormSchema),
    defaultValues: {
      name: product?.name || '',
      batch_number: product?.batch_number || '',
      expiration_date: product?.expiration_date || '',
      origin_country: product?.origin_country || '',
      description: product?.description || '',
      senasa_product_id: product?.senasa_product_id || ''
    },
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Product';
      case 'edit':
        return `Edit ${product?.name}`;
      case 'view':
        return `${product?.name} Details`;
      default:
        return 'Product';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete the information to register a new product.';
      case 'edit':
        return `Modify the fields you want to update for "${product?.name}".`;
      case 'view':
        return `Detailed information for product "${product?.name}".`;
      default:
        return '';
    }
  };

  const handleSubmit = async (data: ProductFormData) => {
    await onSubmit(data);
    if (mode === 'create') {
      form.reset();
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
          senasa_product_id: ''
        });
      } else if (product && (mode === 'edit' || mode === 'view')) {
        form.reset({
          name: product.name || '',
          batch_number: product.batch_number || '',
          origin_country: product.origin_country || '',
          expiration_date: product.expiration_date || '',
          description: product.description || '',
          senasa_product_id: product.senasa_product_id || ''
        });
      }
    }
  }, [isOpen, mode, product, form]);

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
    </ModalForm>
  );
};
