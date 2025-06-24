import React, { useEffect, useState } from 'react';
import { X, Package, Calendar, Globe, FileText, Hash, AlertCircle } from 'lucide-react';
import { Database } from '../../../types/database';
import { useCreateProduct, useUpdateProduct } from '../../../hooks/useProducts';
import { Input } from '../../ui/Form/input';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { Textarea } from '../../ui/Form/form';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  mode: 'create' | 'edit' | 'view';
}

interface ProductFormData {
  name: string;
  batch_number: string;
  origin_country: string;
  expiration_date: string;
  description: string;
  senasa_product_id: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, mode }) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    batch_number: '',
    origin_country: '',
    expiration_date: '',
    description: '',
    senasa_product_id: '',
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  // Inicializar formulario con datos del producto en modo edición/vista
  useEffect(() => {
    if (product && (isEditMode || isViewMode)) {
      setFormData({
        name: product.name || '',
        batch_number: product.batch_number || '',
        origin_country: product.origin_country || '',
        expiration_date: product.expiration_date ? product.expiration_date.split('T')[0] : '',
        description: product.description || '',
        senasa_product_id: product.senasa_product_id || '',
      });
    } else if (isCreateMode) {
      setFormData({
        name: '',
        batch_number: '',
        origin_country: '',
        expiration_date: '',
        description: '',
        senasa_product_id: '',
      });
    }
  }, [product, mode]);

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        batch_number: '',
        origin_country: '',
        expiration_date: '',
        description: '',
        senasa_product_id: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  // Manejo del escape y overflow del body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al empezar a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.batch_number.trim()) {
      newErrors.batch_number = 'El número de lote es requerido';
    }

    if (!formData.origin_country.trim()) {
      newErrors.origin_country = 'El país de origen es requerido';
    }

    if (!formData.expiration_date) {
      newErrors.expiration_date = 'La fecha de vencimiento es requerida';
    } else {
      const expDate = new Date(formData.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expDate < today) {
        newErrors.expiration_date = 'La fecha de vencimiento debe ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isViewMode) return;

    if (!validateForm()) return;

    try {
      const productData = {
        name: formData.name.trim(),
        batch_number: formData.batch_number.trim(),
        origin_country: formData.origin_country.trim(),
        expiration_date: formData.expiration_date,
        description: formData.description.trim() || undefined,
        senasa_product_id: formData.senasa_product_id.trim() || undefined,
      };

      if (isCreateMode) {
        await createProduct.mutateAsync(productData);
      } else if (isEditMode && product) {
        await updateProduct.mutateAsync({
          id: product.product_id,
          data: productData,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Crear Nuevo Producto';
      case 'edit':
        return 'Editar Producto';
      case 'view':
        return 'Detalles del Producto';
      default:
        return 'Producto';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete la información para crear un nuevo producto.';
      case 'edit':
        return 'Modifique los campos que desea actualizar.';
      case 'view':
        return 'Información detallada del producto.';
      default:
        return '';
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="relative border-b border-neutral-200 bg-gradient-to-r from-green-50 to-blue-50 px-6 py-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white/80 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl border border-green-200">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-neutral-900 mb-1">{getModalTitle()}</h2>
              <p className="text-sm text-neutral-600">{getModalDescription()}</p>
              {mode !== 'create' && (
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {mode === 'edit' ? 'Editando' : 'Creando'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre del Producto */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 block">
                Nombre del Producto *
              </label>
              <span className="text-xs text-neutral-500 block">
                Nombre identificativo del producto
              </span>
              <div className="relative">
                <Input
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Fertilizante NPK"
                  disabled={isViewMode}
                  className={cn(
                    'pl-10',
                    errors.name && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                <Package className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Grid de 2 columnas para campos relacionados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Número de Lote */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 block">
                  Número de Lote *
                </label>
                <span className="text-xs text-neutral-500 block">Identificador único del lote</span>
                <div className="relative">
                  <Input
                    value={formData.batch_number}
                    onChange={e => handleInputChange('batch_number', e.target.value)}
                    placeholder="Ej: LOT2024001"
                    disabled={isViewMode}
                    className={cn(
                      'pl-10 font-mono text-sm',
                      errors.batch_number &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                </div>
                {errors.batch_number && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.batch_number}
                  </p>
                )}
              </div>

              {/* País de Origen */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 block">
                  País de Origen *
                </label>
                <span className="text-xs text-neutral-500 block">
                  País donde se produjo el producto
                </span>
                <div className="relative">
                  <Input
                    value={formData.origin_country}
                    onChange={e => handleInputChange('origin_country', e.target.value)}
                    placeholder="Ej: Argentina"
                    disabled={isViewMode}
                    className={cn(
                      'pl-10',
                      errors.origin_country &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                </div>
                {errors.origin_country && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.origin_country}
                  </p>
                )}
              </div>
            </div>

            {/* Grid de 2 columnas para fechas y SENASA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fecha de Vencimiento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 block">
                  Fecha de Vencimiento *
                </label>
                <span className="text-xs text-neutral-500 block">
                  Fecha límite de uso del producto
                </span>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.expiration_date}
                    onChange={e => handleInputChange('expiration_date', e.target.value)}
                    disabled={isViewMode}
                    className={cn(
                      'pl-10',
                      errors.expiration_date &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  />
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                </div>
                {errors.expiration_date && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.expiration_date}
                  </p>
                )}
              </div>

              {/* ID SENASA */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 block">
                  ID Producto SENASA
                </label>
                <span className="text-xs text-neutral-500 block">
                  Identificador SENASA (opcional)
                </span>
                <div className="relative">
                  <Input
                    value={formData.senasa_product_id}
                    onChange={e => handleInputChange('senasa_product_id', e.target.value)}
                    placeholder="Ej: SEN2024001"
                    disabled={isViewMode}
                    className="pl-10 font-mono text-sm"
                  />
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 block">Descripción</label>
              <span className="text-xs text-neutral-500 block">
                Información adicional sobre el producto (opcional)
              </span>
              <Textarea
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Descripción detallada del producto, composición, instrucciones de uso..."
                rows={3}
                disabled={isViewMode}
                className="resize-none"
              />
            </div>

            {/* Información adicional en modo vista */}
            {isViewMode && product && (
              <div className="border-t border-neutral-200 pt-6 space-y-4">
                <h3 className="text-sm font-medium text-neutral-900">Información del Sistema</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="font-medium text-neutral-500">Fecha de Registro:</span>
                    <p className="text-neutral-900">
                      {new Date(product.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-neutral-500">Última Actualización:</span>
                    <p className="text-neutral-900">
                      {product.updated_at
                        ? new Date(product.updated_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Nunca actualizado'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isCreateMode ? 'Creando...' : 'Actualizando...'}
                  </div>
                ) : isCreateMode ? (
                  'Crear Producto'
                ) : (
                  'Actualizar Producto'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
