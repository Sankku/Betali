import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouse';
import { useProducts } from '@/hooks/useProducts';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@/hooks/usePurchaseOrders';
import { CreatePurchaseOrderRequest, PurchaseOrderStatus, calculatePurchaseOrderTotal, calculateLineTotal } from '@/types/purchaseOrders';

/**
 * Purchase Order Item (Line Item)
 */
interface PurchaseOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_sku?: string;
  notes?: string;
}

/**
 * Form Data for Purchase Order
 */
export interface PurchaseOrderFormData {
  supplier_id: string;
  warehouse_id: string;
  expected_delivery_date: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  notes: string;
}

interface PurchaseOrderFormProps {
  form: UseFormReturn<PurchaseOrderFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export function PurchaseOrderForm({ form, mode, isLoading = false }: PurchaseOrderFormProps) {
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data for dropdowns
  const { data: suppliers } = useSuppliers({ searchOptions: { active_only: true } });
  const { data: warehouses } = useWarehouses({ enabled: true });
  const { data: products } = useProducts();

  const { watch, setValue, register } = form;
  const watchedValues = watch();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // Initialize items from form data
  useEffect(() => {
    if (watchedValues.items && watchedValues.items.length > 0) {
      const itemsInSync =
        items.length === watchedValues.items.length &&
        items.every((item, index) => {
          const watchedItem = watchedValues.items[index];
          return (
            item.product_id === watchedItem.product_id &&
            item.quantity === watchedItem.quantity &&
            item.unit_price === watchedItem.unit_price
          );
        });

      if (!itemsInSync) {
        const purchaseOrderItems: PurchaseOrderItem[] = watchedValues.items.map((item) => {
          const product = products?.data?.find((p) => p.product_id === item.product_id);
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
            product_name: product?.name,
            product_sku: product?.sku,
          };
        });
        setItems(purchaseOrderItems);
      }
    } else if (isCreateMode && items.length === 0) {
      // Add one empty item for new purchase orders
      const initialItem: PurchaseOrderItem = { product_id: '', quantity: 1, unit_price: 0 };
      setItems([initialItem]);
      setValue('items', [initialItem]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.items, mode, products?.data]);

  // Calculate totals
  const { subtotal, total } = calculatePurchaseOrderTotal(
    items,
    watchedValues.discount_amount || 0,
    watchedValues.tax_amount || 0,
    watchedValues.shipping_amount || 0
  );

  /**
   * Add new item to purchase order
   */
  const handleAddItem = () => {
    const newItem: PurchaseOrderItem = { product_id: '', quantity: 1, unit_price: 0 };
    const newItems = [...items, newItem];
    setItems(newItems);
    setValue('items', newItems);
  };

  /**
   * Remove item from purchase order
   */
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setErrors({ ...errors, items: 'Debe haber al menos un producto en la orden de compra' });
      return;
    }

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setValue('items', newItems);

    // Clear error
    const newErrors = { ...errors };
    delete newErrors.items;
    setErrors(newErrors);
  };

  /**
   * Update item in purchase order
   */
  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If product changed, update name, SKU, and default price
    if (field === 'product_id' && value) {
      const product = products?.data?.find((p) => p.product_id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].product_sku = product.sku;
        newItems[index].unit_price = product.cost_price || product.unit_price || 0;
      }
    }

    setItems(newItems);
    setValue('items', newItems);
  };

  /**
   * Get minimum date for expected delivery (today)
   */
  const getMinDeliveryDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier */}
        <div className="space-y-2">
          <Label htmlFor="supplier_id">Proveedor *</Label>
          <Select
            value={watchedValues.supplier_id}
            onValueChange={(value) => setValue('supplier_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger id="supplier_id">
              <SelectValue placeholder="Seleccionar proveedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.name} {supplier.cuit && `(${supplier.cuit})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warehouse */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="warehouse_id">Almacén *</Label>
            <TooltipHelp
              content="Almacén donde se recibirá y almacenará la mercadería de esta orden de compra."
              position="right"
            />
          </div>
          <Select
            value={watchedValues.warehouse_id}
            onValueChange={(value) => setValue('warehouse_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger id="warehouse_id">
              <SelectValue placeholder="Seleccionar almacén" />
            </SelectTrigger>
            <SelectContent>
              {warehouses?.data?.map((warehouse) => (
                <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.name} {warehouse.location && `- ${warehouse.location}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expected Delivery Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="expected_delivery_date">Fecha de Entrega Esperada</Label>
            <TooltipHelp
              content="Fecha estimada en la que esperas recibir la mercadería del proveedor. Ayuda a planificar el inventario."
              position="right"
            />
          </div>
          <Input
            id="expected_delivery_date"
            type="date"
            min={getMinDeliveryDate()}
            {...register('expected_delivery_date')}
            disabled={isViewMode}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado *</Label>
          <Select
            value={watchedValues.status}
            onValueChange={(value) => setValue('status', value as PurchaseOrderStatus)}
            disabled={isViewMode || isEditMode} // Status should be changed via status update endpoint
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {PURCHASE_ORDER_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEditMode && (
            <p className="text-sm text-muted-foreground">
              El estado se actualiza mediante acciones específicas
            </p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos</CardTitle>
          {!isViewMode && (
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {errors.items && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errors.items}
            </div>
          )}

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Product Selection */}
                  <div className="md:col-span-5">
                    <Label htmlFor={`item-product-${index}`}>Producto *</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger id={`item-product-${index}`}>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.data?.map((product) => (
                          <SelectItem key={product.product_id} value={product.product_id}>
                            {product.name} {product.sku && `(${product.sku})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`item-quantity-${index}`}>Cantidad *</Label>
                    <Input
                      id={`item-quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      disabled={isViewMode}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`item-price-${index}`}>Precio Unitario *</Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                      disabled={isViewMode}
                    />
                  </div>

                  {/* Line Total */}
                  <div className="md:col-span-2">
                    <Label>Total</Label>
                    <div className="h-10 flex items-center font-semibold text-foreground">
                      ${calculateLineTotal(item.quantity, item.unit_price).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  {!isViewMode && (
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Item Notes */}
                <div className="mt-2">
                  <Label htmlFor={`item-notes-${index}`}>Notas del Producto (Opcional)</Label>
                  <Input
                    id={`item-notes-${index}`}
                    placeholder="Notas adicionales sobre este producto..."
                    value={item.notes || ''}
                    onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                    disabled={isViewMode}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Costs & Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Costos Adicionales y Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="discount_amount">Descuento</Label>
                <TooltipHelp
                  content="Monto de descuento otorgado por el proveedor. Se restará del subtotal."
                  position="right"
                />
              </div>
              <Input
                id="discount_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('discount_amount', { valueAsNumber: true })}
                disabled={isViewMode}
              />
            </div>

            {/* Tax */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tax_amount">Impuestos</Label>
                <TooltipHelp
                  content="Monto de impuestos aplicables a esta compra (IVA, etc.). Se sumará al total."
                  position="right"
                />
              </div>
              <Input
                id="tax_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('tax_amount', { valueAsNumber: true })}
                disabled={isViewMode}
              />
            </div>

            {/* Shipping */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="shipping_amount">Envío</Label>
                <TooltipHelp
                  content="Costo de envío o flete de la mercadería. Se sumará al total de la compra."
                  position="right"
                />
              </div>
              <Input
                id="shipping_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('shipping_amount', { valueAsNumber: true })}
                disabled={isViewMode}
              />
            </div>

            {/* Total Summary */}
            <div className="space-y-2">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Subtotal:</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Descuento:</span>
                  <span className="font-semibold text-green-700 dark:text-green-500">
                    -${(watchedValues.discount_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Impuestos:</span>
                  <span className="font-semibold text-foreground">${(watchedValues.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Envío:</span>
                  <span className="font-semibold text-foreground">
                    ${(watchedValues.shipping_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">TOTAL:</span>
                    <span className="font-bold text-lg text-foreground">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea
          id="notes"
          placeholder="Notas generales sobre la orden de compra..."
          rows={4}
          {...register('notes')}
          disabled={isViewMode}
        />
      </div>
    </div>
  );
}
