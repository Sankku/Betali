import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from '@/contexts/LanguageContext';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouse';
import { useProductTypes } from '@/hooks/useProductTypes';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@/hooks/usePurchaseOrders';
import { CreatePurchaseOrderRequest, PurchaseOrderStatus, calculatePurchaseOrderTotal, calculateLineTotal } from '@/types/purchaseOrders';

/**
 * Purchase Order Item (Line Item)
 */
interface PurchaseOrderItem {
  product_type_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
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
  const { t } = useTranslation();
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data for dropdowns
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliers({ searchOptions: { active_only: true } });
  const { data: warehouses, refetch: refetchWarehouses } = useWarehouses({ enabled: true });
  const { data: productTypes } = useProductTypes();

  const { watch, setValue, register, formState: { errors: formErrors } } = form;

  // Normalize a money field to 2 decimal places on blur.
  const handleMoneyBlur =
    (field: 'discount_amount' | 'tax_amount' | 'shipping_amount') =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setValue(field, isNaN(val) ? 0 : parseFloat(val.toFixed(2)));
    };
  const watchedValues = watch();

  // Register required fields so RHF tracks validation
  register('supplier_id', { required: t('purchaseOrders.form.supplierRequired') });
  register('warehouse_id', { required: t('purchaseOrders.form.warehouseRequired') });

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // Initialize items from form data
  useEffect(() => {
    if (isCreateMode) {
      refetchSuppliers();
      refetchWarehouses();
    }

    if (watchedValues.items) {
      const itemsInSync =
        items.length === watchedValues.items.length &&
        items.every((item, index) => {
          const watchedItem = watchedValues.items[index];
          return (
            item.product_type_id === watchedItem?.product_type_id &&
            item.quantity === watchedItem?.quantity &&
            item.unit_price === watchedItem?.unit_price
          );
        });

      if (!itemsInSync) {
        const purchaseOrderItems: PurchaseOrderItem[] = watchedValues.items.map((item) => {
          const productType = (productTypes || []).find((p) => p.product_type_id === item.product_type_id);
          return {
            product_type_id: item.product_type_id ?? '',
            quantity: item.quantity ?? 1,
            unit_price: item.unit_price ?? 0,
            notes: item.notes,
            product_name: productType?.name,
            product_sku: productType?.sku,
          };
        });
        setItems(purchaseOrderItems);
      }
    } else if (isCreateMode && items.length === 0) {
      // Add one empty item for new purchase orders
      const initialItem: PurchaseOrderItem = { product_type_id: '', quantity: 1, unit_price: 0 };
      setItems([initialItem]);
      setValue('items', [initialItem]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.items, mode, productTypes]);

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
    const newItem: PurchaseOrderItem = { product_type_id: '', quantity: 1, unit_price: 0 };
    const newItems = [...items, newItem];
    setItems(newItems);
    setValue('items', newItems);
  };

  /**
   * Remove item from purchase order
   */
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setErrors({ ...errors, items: t('purchaseOrders.form.minOneProduct') });
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

    // If product type changed, update name and SKU
    if (field === 'product_type_id' && value) {
      const productType = (productTypes || []).find((p) => p.product_type_id === value);
      if (productType) {
        newItems[index].product_name = productType.name;
        newItems[index].product_sku = productType.sku;
        newItems[index].product_unit = productType.unit;
        newItems[index].unit_price = 0;
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
          <Label htmlFor="supplier_id">
            {t('purchaseOrders.form.supplierLabel')} <span className="text-danger-500 ml-0.5">*</span>
          </Label>
          <Select
            value={watchedValues.supplier_id}
            onValueChange={(value) => setValue('supplier_id', value, { shouldValidate: true })}
            disabled={isViewMode}
          >
            <SelectTrigger
              id="supplier_id"
              className={formErrors.supplier_id ? 'border-danger-500 focus:ring-danger-500' : ''}
            >
              <SelectValue placeholder={t('purchaseOrders.form.supplierPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.name} {supplier.cuit && `(${supplier.cuit})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.supplier_id && (
            <p className="text-xs text-danger-500">{formErrors.supplier_id.message}</p>
          )}
        </div>

        {/* Warehouse */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="warehouse_id">
              {t('purchaseOrders.form.warehouseLabel')} <span className="text-danger-500 ml-0.5">*</span>
            </Label>
            <TooltipHelp
              content={t('purchaseOrders.form.warehouseTooltip')}
              position="right"
            />
          </div>
          <Select
            value={watchedValues.warehouse_id}
            onValueChange={(value) => setValue('warehouse_id', value, { shouldValidate: true })}
            disabled={isViewMode}
          >
            <SelectTrigger
              id="warehouse_id"
              className={formErrors.warehouse_id ? 'border-danger-500 focus:ring-danger-500' : ''}
            >
              <SelectValue placeholder={t('purchaseOrders.form.warehousePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {warehouses?.data?.map((warehouse) => (
                <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.name} {warehouse.location && `- ${warehouse.location}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.warehouse_id && (
            <p className="text-xs text-danger-500">{formErrors.warehouse_id.message}</p>
          )}
        </div>

        {/* Expected Delivery Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="expected_delivery_date">{t('purchaseOrders.form.deliveryDate')}</Label>
            <TooltipHelp
              content={t('purchaseOrders.form.deliveryDateTooltip')}
              position="right"
            />
          </div>
          <DatePicker
            value={watchedValues.expected_delivery_date ? new Date(`${watchedValues.expected_delivery_date}T00:00:00`) : undefined}
            onChange={(date) => {
              setValue('expected_delivery_date', date ? date.toISOString().split('T')[0] : '', { shouldValidate: true });
            }}
            minDate={new Date(getMinDeliveryDate() + 'T00:00:00')}
            disabled={isViewMode}
            placeholder={t('purchaseOrders.form.deliveryDatePlaceholder')}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">{t('purchaseOrders.form.statusLabel')} <span className="text-danger-500 ml-0.5">*</span></Label>
          <Select
            value={watchedValues.status}
            onValueChange={(value) => setValue('status', value as PurchaseOrderStatus)}
            disabled={isViewMode || isEditMode} // Status should be changed via status update endpoint
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t('purchaseOrders.form.statusPlaceholder')} />
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
              {t('purchaseOrders.form.statusNote')}
            </p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{t('purchaseOrders.form.productsTitle')}</CardTitle>
          {!isViewMode && (
            <Button type="button" size="sm" className="flex items-center gap-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4 text-white" />
              {t('purchaseOrders.form.addProduct')}
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
                  {/* Product Type Selection */}
                  <div className="md:col-span-5">
                    <Label htmlFor={`item-product-${index}`}>{t('purchaseOrders.form.productLabel')} <span className="text-danger-500 ml-0.5">*</span></Label>
                    <Select
                      key={`product-select-${index}-${item.product_type_id}-${productTypes?.length ?? 0}`}
                      value={item.product_type_id || ''}
                      onValueChange={(value) => handleItemChange(index, 'product_type_id', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger id={`item-product-${index}`}>
                        <SelectValue placeholder={t('purchaseOrders.form.productPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(productTypes || []).map((productType) => (
                          <SelectItem key={productType.product_type_id} value={productType.product_type_id}>
                            {productType.name} {productType.sku && `(SKU: ${productType.sku})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`item-quantity-${index}`}>{t('purchaseOrders.form.quantityLabel')} <span className="text-danger-500 ml-0.5">*</span></Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`item-quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)
                        }
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!val || val < 1) handleItemChange(index, 'quantity', 1);
                        }}
                        disabled={isViewMode}
                      />
                      {item.product_unit && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.product_unit}</span>
                      )}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`item-price-${index}`}>{t('purchaseOrders.form.unitPrice')} <span className="text-danger-500 ml-0.5">*</span></Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onChange={(e) =>
                        handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        handleItemChange(index, 'unit_price', isNaN(val) ? 0 : parseFloat(val.toFixed(2)));
                      }}
                      disabled={isViewMode}
                    />
                  </div>

                  {/* Line Total */}
                  <div className="md:col-span-2">
                    <Label>{t('purchaseOrders.form.lineTotal')}</Label>
                    <div className="h-10 flex items-center font-semibold text-neutral-900">
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
                  <Label htmlFor={`item-notes-${index}`}>{t('purchaseOrders.form.itemNotes')}</Label>
                  <Input
                    id={`item-notes-${index}`}
                    placeholder={t('purchaseOrders.form.itemNotesPlaceholder')}
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
          <CardTitle>{t('purchaseOrders.form.costsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="discount_amount">{t('purchaseOrders.form.discountLabel')}</Label>
                <TooltipHelp
                  content={t('purchaseOrders.form.discountTooltip')}
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
                onBlur={handleMoneyBlur('discount_amount')}
                disabled={isViewMode}
              />
            </div>

            {/* Tax */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tax_amount">{t('purchaseOrders.form.taxLabel')}</Label>
                <TooltipHelp
                  content={t('purchaseOrders.form.taxTooltip')}
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
                onBlur={handleMoneyBlur('tax_amount')}
                disabled={isViewMode}
              />
            </div>

            {/* Shipping */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="shipping_amount">{t('purchaseOrders.form.shippingLabel')}</Label>
                <TooltipHelp
                  content={t('purchaseOrders.form.shippingTooltip')}
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
                onBlur={handleMoneyBlur('shipping_amount')}
                disabled={isViewMode}
              />
            </div>

            {/* Total Summary */}
            <div className="space-y-2">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-800">{t('purchaseOrders.form.subtotal')}</span>
                  <span className="font-semibold text-neutral-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-800">{t('purchaseOrders.form.discountSummary')}</span>
                  <span className="font-semibold text-green-600">
                    -${(watchedValues.discount_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-800">{t('purchaseOrders.form.taxSummary')}</span>
                  <span className="font-semibold text-neutral-900">${(watchedValues.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-800">{t('purchaseOrders.form.shippingSummary')}</span>
                  <span className="font-semibold text-neutral-900">
                    ${(watchedValues.shipping_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900">{t('purchaseOrders.form.totalLabel')}</span>
                    <span className="font-bold text-lg text-neutral-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('purchaseOrders.form.notesLabel')}</Label>
        <Textarea
          id="notes"
          placeholder={t('purchaseOrders.form.notesPlaceholder')}
          rows={4}
          {...register('notes')}
          disabled={isViewMode}
        />
      </div>
    </div>
  );
}
