import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { ProductForm, ProductFormData } from './product-form';

// Schema de validación
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  batch_number: z.string().min(1, 'El número de lote es requerido'),
  expiry_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
  country_of_origin: z.string().min(1, 'El país de origen es requerido'),
});

export interface Product {
  id: string;
  name: string;
  batch_number: string;
  expiry_date: string;
  country_of_origin: string;
  created_at: string;
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
      expiry_date: product?.expiry_date || '',
      country_of_origin: product?.country_of_origin || '',
    },
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Crear Nuevo Producto';
      case 'edit':
        return `Editar ${product?.name}`;
      case 'view':
        return `Detalles de ${product?.name}`;
      default:
        return 'Producto';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete la información para registrar un nuevo producto.';
      case 'edit':
        return `Modifique los campos que desee actualizar para "${product?.name}".`;
      case 'view':
        return `Información detallada del producto "${product?.name}".`;
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
          country_of_origin: '',
          expiry_date: '',
        });
      } else if (product && (mode === 'edit' || mode === 'view')) {
        form.reset({
          name: product.name || '',
          batch_number: product.batch_number || '',
          country_of_origin: product.country_of_origin ?? true,
          expiry_date: product.expiry_date ?? '',
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
