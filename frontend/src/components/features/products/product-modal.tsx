import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { ProductForm, ProductFormData } from './product-form';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  expiration_date: z.string().min(1, 'Expiration date is required'),
  origin_country: z.string().min(1, 'Country of origin is required'),
});

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
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      batch_number: product?.batch_number || '',
      expiration_date: product?.expiration_date || '', // ✅ CORREGIDO
      origin_country: product?.origin_country || '', // ✅ CORREGIDO
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
        });
      } else if (product && (mode === 'edit' || mode === 'view')) {
        form.reset({
          name: product.name || '',
          batch_number: product.batch_number || '',
          origin_country: product.origin_country || '',
          expiration_date: product.expiration_date || '',
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
