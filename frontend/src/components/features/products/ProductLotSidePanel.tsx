import React, { useEffect } from 'react';
import { X, Hash, Calendar, Globe, DollarSign, Warehouse, Package } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useWarehouses } from '../../../hooks/useWarehouse';
import type { ProductLot, ProductLotFormData } from '../../../services/api/productLotsService';

interface ProductLotSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductLotFormData) => Promise<void>;
  lot?: ProductLot;
  productTypeName?: string;
  isLoading?: boolean;
}

const defaultForm: ProductLotFormData = {
  lot_number: '',
  expiration_date: '',
  origin_country: '',
  warehouse_id: '',
  initial_quantity: undefined,
  price: 0,
  sale_price: null,
};

export const ProductLotSidePanel: React.FC<ProductLotSidePanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lot,
  productTypeName,
  isLoading = false,
}) => {
  const [form, setForm] = React.useState<ProductLotFormData>(defaultForm);
  const [errors, setErrors] = React.useState<Partial<Record<keyof ProductLotFormData, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const { data: warehouses } = useWarehouses({ enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      if (lot) {
        setForm({
          lot_number: lot.lot_number,
          expiration_date: lot.expiration_date,
          origin_country: lot.origin_country || '',
          warehouse_id: lot.warehouse_id || '',
          initial_quantity: undefined,
          price: lot.price,
          sale_price: lot.sale_price ?? null,
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [isOpen, lot]);

  const isEditMode = !!lot;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductLotFormData, string>> = {};
    if (!form.lot_number.trim()) newErrors.lot_number = 'El numero de lote es requerido';
    if (!form.expiration_date) newErrors.expiration_date = 'La fecha de vencimiento es requerida';
    if (!isEditMode && !form.warehouse_id) newErrors.warehouse_id = 'El almacén es requerido';
    if (!form.price || form.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
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

  const handleChange = (field: keyof ProductLotFormData, value: string | number) => {
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
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {lot ? 'Editar Lote' : 'Nuevo Lote'}
            </h2>
            {productTypeName && (
              <p className="text-sm text-neutral-500 mt-0.5">{productTypeName}</p>
            )}
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
            {/* Numero de lote */}
            <Input
              label="Nro de Lote"
              name="lot_number"
              value={form.lot_number}
              onChange={e => handleChange('lot_number', e.target.value)}
              placeholder="Ej: LOT-2025-001"
              icon={<Hash className="h-4 w-4" />}
              disabled={isProcessing}
              error={errors.lot_number}
              required
            />

            {/* Vencimiento */}
            <div className="space-y-2">
              <label
                htmlFor="expiration_date"
                className="text-sm font-semibold text-neutral-800 flex items-center"
              >
                <span className="text-neutral-600 mr-2"><Calendar className="h-4 w-4" /></span>
                Vencimiento
                <span className="text-danger-500 ml-1">*</span>
              </label>
              <input
                id="expiration_date"
                type="date"
                value={form.expiration_date}
                onChange={e => handleChange('expiration_date', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 ${
                  errors.expiration_date ? 'border-danger-500' : 'border-neutral-300'
                }`}
              />
              {errors.expiration_date && (
                <p className="text-sm text-danger-600 font-medium">{errors.expiration_date}</p>
              )}
            </div>

            {/* Almacén */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-neutral-600" />
                Almacén
                {!isEditMode && <span className="text-danger-500">*</span>}
              </label>
              <select
                value={form.warehouse_id}
                onChange={e => handleChange('warehouse_id', e.target.value)}
                disabled={isProcessing}
                className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 ${
                  errors.warehouse_id ? 'border-danger-500' : 'border-neutral-300'
                }`}
              >
                <option value="">Seleccionar almacén...</option>
                {warehouses?.data?.map(w => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name}{w.location ? ` — ${w.location}` : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && (
                <p className="text-sm text-danger-600 font-medium">{errors.warehouse_id}</p>
              )}
            </div>

            {/* Cantidad inicial — solo en creación */}
            {!isEditMode && (
              <Input
                label="Cantidad inicial (opcional)"
                name="initial_quantity"
                type="number"
                min="0"
                step="0.001"
                value={form.initial_quantity ?? ''}
                onChange={e => handleChange('initial_quantity', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                placeholder="0"
                icon={<Package className="h-4 w-4" />}
                disabled={isProcessing}
              />
            )}

            {/* Pais de origen */}
            <Input
              label="Pais de origen"
              name="origin_country"
              value={form.origin_country}
              onChange={e => handleChange('origin_country', e.target.value)}
              placeholder="Ej: Argentina"
              icon={<Globe className="h-4 w-4" />}
              disabled={isProcessing}
              error={errors.origin_country}
            />

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio de compra"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price || ''}
                onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                icon={<DollarSign className="h-4 w-4" />}
                disabled={isProcessing}
                error={errors.price}
                required
              />
              <Input
                label="Precio de venta"
                name="sale_price"
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price ?? ''}
                onChange={e => handleChange('sale_price', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                icon={<DollarSign className="h-4 w-4" />}
                disabled={isProcessing}
              />
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
              Cancelar
            </Button>
            <Button type="submit" loading={isProcessing}>
              {lot ? 'Guardar cambios' : 'Crear lote'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
