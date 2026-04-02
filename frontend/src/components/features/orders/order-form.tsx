import React, { useState, useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from '@/contexts/LanguageContext';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/useClients';
import { useWarehouses } from '@/hooks/useWarehouse';
import { useProductTypes } from '@/hooks/useProductTypes';
import { useTaxRates } from '@/hooks/useTaxRates';
import { Order } from '@/services/api/orderService';
import { ORDER_STATUS_OPTIONS } from '@/hooks/useOrders';
import { useRealtimePricing, formatPricing } from '@/hooks/usePricing';
import { useAvailableLots } from '@/hooks/useAvailableStock';
import { OrderItemWithStockValidation } from './OrderItemWithStockValidation';

interface OrderItem {
  product_type_id: string;
  lot_id?: string;
  quantity: number;
  price: number;
  product_name?: string;
  product_sku?: string;
}

interface OrderFormData {
  client_id: string;
  warehouse_id: string;
  status: Order['status'];
  notes: string;
  tax_rate_ids: string[];
  items: Array<{
    product_type_id: string;
    lot_id?: string;
    quantity: number;
    price: number;
  }>;
}

interface OrderFormProps {
  form: UseFormReturn<OrderFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

/** Inner lot selector — fetches available lots for a product+warehouse combination */
function LotSelector({
  productTypeId,
  warehouseId,
  value,
  onChange,
  disabled,
}: {
  productTypeId: string;
  warehouseId: string;
  value?: string;
  onChange: (lotId: string) => void;
  disabled?: boolean;
}) {
  const { data: lots, isLoading } = useAvailableLots(productTypeId, warehouseId);

  if (!lots && !isLoading) return null;

  return (
    <div className="space-y-1">
      <Label className="text-gray-900 font-medium text-sm">
        Lote <span className="text-gray-400 font-normal text-xs">(opcional)</span>
      </Label>
      <Select
        value={value || 'auto'}
        onValueChange={(v) => onChange(v === 'auto' ? '' : v)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="text-sm">
          <SelectValue placeholder={isLoading ? 'Cargando lotes...' : 'Auto (recomendado)'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">
            <span className="text-gray-500 italic">Auto (recomendado)</span>
          </SelectItem>
          {lots?.map((lot) => (
            <SelectItem key={lot.lot_id} value={lot.lot_id}>
              <div className="flex flex-col">
                <span className="font-medium">{lot.lot_number}</span>
                <span className="text-xs text-gray-500">
                  Stock: {lot.available_stock}
                  {lot.expiration_date && ` · Vence: ${new Date(lot.expiration_date).toLocaleDateString('es-AR')}`}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function OrderForm({ form, mode, isLoading = false }: OrderFormProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load hooks for dropdowns with fresh data
  const { data: clients, refetch: refetchClients } = useClients({
    enabled: true,
    refetchInterval: false, // Only refetch manually or on invalidation
  });
  const { data: warehouses, refetch: refetchWarehouses } = useWarehouses({
    enabled: true,
    refetchInterval: false,
  });
  const { data: productTypes, isLoading: productsLoading, error: productsError } = useProductTypes();
  const { data: taxRates } = useTaxRates({ active_only: true });

  const { watch, setValue, register, formState: { errors: formErrors, isSubmitted } } = form;
  const watchedValues = watch();

  // Prepare order data for pricing calculation with memoization
  const orderDataForPricing = useMemo(() => ({
    client_id: watchedValues.client_id && watchedValues.client_id !== 'no-client' ? watchedValues.client_id : undefined,
    warehouse_id: watchedValues.warehouse_id && watchedValues.warehouse_id !== 'no-warehouse' ? watchedValues.warehouse_id : undefined,
    tax_rate_ids: watchedValues.tax_rate_ids || [],
    items: items.filter(item => item.product_type_id && item.quantity > 0).map(item => ({
      product_type_id: item.product_type_id,
      quantity: item.quantity,
      price: item.price
    }))
  }), [
    watchedValues.client_id,
    watchedValues.warehouse_id,
    watchedValues.tax_rate_ids,
    items
  ]);

  // Use real-time pricing calculation
  const { mutation: pricingMutation, pricingResult, isLoading: pricingLoading, isValidData } = useRealtimePricing(
    orderDataForPricing,
    true
  );

  // Refresh data when component mounts (for modal usage)
  useEffect(() => {
    if (mode === 'create') {
      refetchClients();
      refetchWarehouses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Only run when mode changes, not when refetch functions change

  // Initialize items from form data
  useEffect(() => {
    if (watchedValues.items && watchedValues.items.length > 0) {
      // Check if items are already in sync to prevent unnecessary updates
      const itemsInSync = items.length === watchedValues.items.length &&
        items.every((item, index) => {
          const watchedItem = watchedValues.items[index];
          return item.product_type_id === watchedItem.product_type_id &&
            item.lot_id === watchedItem.lot_id &&
            item.quantity === watchedItem.quantity &&
            item.price === watchedItem.price;
        });

      if (!itemsInSync) {
        const orderItems: OrderItem[] = watchedValues.items.map(item => {
          const productType = productTypes?.find(p => p.product_type_id === item.product_type_id);
          return {
            product_type_id: item.product_type_id,
            lot_id: item.lot_id,
            quantity: item.quantity,
            price: item.price,
            product_name: productType?.name,
            product_sku: productType?.sku,
          };
        });
        setItems(orderItems);
      }
    } else if (mode === 'create' && items.length === 0) {
      // Add one empty item for new orders
      const initialItem = { product_type_id: '', quantity: 1, price: 0 };
      setItems([initialItem]);
      setValue('items', [initialItem]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.items, mode, productTypes]); // Removed items.length and setValue to prevent infinite loops

  // Recalculate pricing when items change
  useEffect(() => {
    if (isValidData && orderDataForPricing.items.length > 0) {
      const timeoutId = setTimeout(() => {
        pricingMutation.mutate(orderDataForPricing);
      }, 500); // Debounce API calls

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Use serialized version of items to avoid infinite loops
    JSON.stringify(items.map(item => ({
      product_type_id: item.product_type_id,
      quantity: item.quantity,
      price: item.price
    }))),
    watchedValues.client_id, 
    watchedValues.warehouse_id,
    watchedValues.tax_rate_ids,
    isValidData
    // orderDataForPricing and pricingMutation.mutate are derived/memoized values
  ]);

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];

    if (field === 'product_type_id') {
      const selectedProductType = productTypes?.find(p => p.product_type_id === value);
      if (selectedProductType) {
        newItems[index] = {
          ...newItems[index],
          product_type_id: value as string,
          lot_id: undefined, // reset lot when product changes
          price: 0,
          product_name: selectedProductType.name,
          product_sku: selectedProductType.sku,
        };
      }
    } else if (field === 'lot_id') {
      newItems[index] = { ...newItems[index], lot_id: value as string || undefined };
    } else if (field === 'quantity') {
      newItems[index] = {
        ...newItems[index],
        quantity: Math.max(1, Number(value)),
      };
    } else if (field === 'price') {
      newItems[index] = {
        ...newItems[index],
        price: Number(value),
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
    }

    setItems(newItems);
    setValue('items', newItems.map(item => ({
      product_type_id: item.product_type_id,
      lot_id: item.lot_id,
      quantity: item.quantity,
      price: item.price,
    })));
  };

  const addItem = () => {
    const newItem = { product_type_id: '', lot_id: undefined, quantity: 1, price: 0 };
    const newItems = [...items, newItem];
    setItems(newItems);
    setValue('items', newItems.map(item => ({
      product_type_id: item.product_type_id,
      lot_id: item.lot_id,
      quantity: item.quantity,
      price: item.price,
    })));
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      setValue('items', newItems.map(item => ({
        product_type_id: item.product_type_id,
        lot_id: item.lot_id,
        quantity: item.quantity,
        price: item.price,
      })));
    }
  };

  const noTaxSelected = !watchedValues.tax_rate_ids || watchedValues.tax_rate_ids.length === 0;

  const calculateTotals = () => {
    // Use pricing result from backend if available, otherwise fallback to basic calculation
    if (pricingResult) {
      // If user explicitly chose "No tax", override any stale tax from a previous result
      const tax = noTaxSelected ? 0 : (pricingResult.tax_amount ?? 0);
      const subtotal = pricingResult.subtotal ?? 0;
      const discount = pricingResult.discount_amount ?? 0;
      const shipping = pricingResult.shipping_amount ?? 0;
      const total = noTaxSelected ? subtotal - discount + shipping : (pricingResult.total ?? subtotal - discount + shipping);
      return { subtotal, tax, total, discount, shipping };
    }

    // Fallback to basic calculation
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total, discount: 0, shipping: 0 };
  };

  const { subtotal, tax, total, discount, shipping } = calculateTotals();
  const isViewMode = mode === 'view';

  return (
    <div className="space-y-6">
      {/* Order Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="client_id" className="text-gray-900 font-medium">{t('orders.form.client')} <span className="text-gray-400 font-normal text-xs">{t('orders.form.clientOptional')}</span></Label>
          <Select
            value={watchedValues.client_id || 'no-client'}
            onValueChange={(value) => setValue('client_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('orders.form.clientPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-client">
                <span className="text-gray-500 italic">{t('orders.form.noClient')}</span>
              </SelectItem>
              {clients?.data?.map((client) => (
                <SelectItem key={client.client_id} value={client.client_id}>
                  <span className="text-gray-900 font-medium">{client.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouse_id" className="text-gray-900 font-medium">{t('orders.form.warehouse')} <span className="text-red-500">*</span></Label>
          <Select
            value={watchedValues.warehouse_id || 'no-warehouse'}
            onValueChange={(value) => setValue('warehouse_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('orders.form.warehousePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-warehouse">
                <span className="text-gray-500 italic">{t('orders.form.noWarehouse')}</span>
              </SelectItem>
              {warehouses?.data?.map((warehouse) => (
                <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  <span className="text-gray-900 font-medium">{warehouse.name} - {warehouse.location}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_rate_ids" className="text-gray-900 font-medium">{t('orders.form.taxRates')} <span className="text-gray-400 font-normal text-xs">{t('orders.form.clientOptional')}</span></Label>
          <Select
            value={watchedValues.tax_rate_ids?.length ? watchedValues.tax_rate_ids[0] : 'no-tax'}
            onValueChange={(value) => setValue('tax_rate_ids', value === 'no-tax' ? [] : [value])}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('orders.form.taxRatesPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-tax">
                <span className="text-gray-500 italic">{t('orders.form.noTax')}</span>
              </SelectItem>
              {taxRates?.data?.map((taxRate) => (
                <SelectItem key={taxRate.tax_rate_id} value={taxRate.tax_rate_id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-900 font-medium">{taxRate.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(taxRate.rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status" className="text-gray-900 font-medium">{t('orders.form.status')}</Label>
          <Select 
            value={watchedValues.status} 
            onValueChange={(value) => setValue('status', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`bg-${status.color}-50 text-${status.color}-700 border-${status.color}-200`}>
                      {t(`orders.status.${status.value}`)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-900 font-medium">{t('orders.form.notes')} <span className="text-gray-400 font-normal text-xs">{t('orders.form.notesOptional')}</span></Label>
          <Textarea
            {...register('notes')}
            placeholder={t('orders.form.notesPlaceholder')}
            rows={3}
            disabled={isViewMode}
          />
        </div>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg text-gray-900">{t('orders.form.orderItems')}</CardTitle>
          {!isViewMode && (
            <Button type="button" onClick={addItem} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-white" />
              {t('orders.form.addItem')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {formErrors.root && (
            <p className="text-sm text-red-600">{formErrors.root.message}</p>
          )}
          
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-gray-50">
              <div className="md:col-span-2">
                <Label className="text-gray-900 font-medium">{t('orders.form.product')} *</Label>
                <Select
                  value={item.product_type_id}
                  onValueChange={(value) => handleItemChange(index, 'product_type_id', value)}
                  disabled={isViewMode}
                >
                  <SelectTrigger className={(isSubmitted && !item.product_type_id) ? 'border-red-500' : ''}>
                    <SelectValue placeholder={
                      productsLoading ? t('orders.form.loadingProducts') :
                      productsError ? t('orders.form.errorLoadingProducts') :
                      t('orders.form.chooseProduct')
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes && productTypes.length > 0 ? (
                      productTypes.map((productType) => (
                        <SelectItem key={productType.product_type_id} value={productType.product_type_id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{productType.name}</span>
                            <span className="text-sm text-gray-700">
                              SKU: {productType.sku}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-products" disabled>
                        <span className="text-gray-500 italic">{t('orders.form.noProducts')}</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isSubmitted && !item.product_type_id && (
                  <p className="text-sm text-red-600 mt-1">{t('orders.form.productRequired')}</p>
                )}
              </div>

              {/* Lot selector — only shown when product and warehouse are selected */}
              <div className="md:col-span-1">
                {item.product_type_id && watchedValues.warehouse_id && watchedValues.warehouse_id !== 'no-warehouse' ? (
                  <LotSelector
                    productTypeId={item.product_type_id}
                    warehouseId={watchedValues.warehouse_id}
                    value={item.lot_id}
                    onChange={(lotId) => handleItemChange(index, 'lot_id', lotId)}
                    disabled={isViewMode}
                  />
                ) : (
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium text-sm">
                      Lote <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </Label>
                    <div className="h-10 flex items-center text-sm text-gray-400 italic">Auto (recomendado)</div>
                  </div>
                )}
              </div>

              {/* Quantity with real-time stock validation */}
              <OrderItemWithStockValidation
                item={item}
                index={index}
                warehouseId={watchedValues.warehouse_id !== 'no-warehouse' ? watchedValues.warehouse_id : undefined}
                onQuantityChange={handleItemChange}
                errors={errors}
                isViewMode={isViewMode}
              />

              <div>
                <Label className="text-gray-900 font-medium">{t('orders.form.price')} *</Label>
                <Input
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className={errors[`item_${index}_price`] ? 'border-red-500' : ''}
                  disabled={isViewMode}
                />
                {errors[`item_${index}_price`] && (
                  <p className="text-sm text-red-600 mt-1">{errors[`item_${index}_price`]}</p>
                )}
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <Label className="text-gray-900 font-medium">{t('orders.form.lineTotal')}</Label>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">${(item.quantity * item.price).toFixed(2)}</span>
                    {!isViewMode && items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Order Totals */}
          <div className="border-t pt-4 space-y-3 bg-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{t('orders.form.orderSummary')}</h4>
              {pricingLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  {t('orders.form.calculating')}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-800">
                <span className="font-medium">{t('orders.form.subtotal')}</span>
                <span className="font-semibold text-gray-900">{formatPricing(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm text-gray-800">
                  <span className="font-medium text-red-600">{t('orders.form.discount')}</span>
                  <span className="font-semibold text-red-600">-{formatPricing(discount)}</span>
                </div>
              )}

              {tax > 0 ? (
                <div className="flex justify-between text-sm text-gray-800">
                  <span className="font-medium">{t('orders.form.tax')}</span>
                  <span className="font-semibold text-gray-900">
                    {formatPricing(tax)}
                    {pricingResult?.tax_breakdown && pricingResult.tax_breakdown.length > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({pricingResult.tax_breakdown.map(tb => `${tb.name ?? t('orders.form.tax').replace(':', '')}: ${(tb.rate * 100).toFixed(1)}%`).join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-gray-800">
                  <span className="font-medium">{t('orders.form.tax')}</span>
                  <span className="text-gray-500 italic">{t('orders.form.noTaxApplied')}</span>
                </div>
              )}

              {shipping > 0 && (
                <div className="flex justify-between text-sm text-gray-800">
                  <span className="font-medium">{t('orders.form.shipping')}</span>
                  <span className="font-semibold text-gray-900">{formatPricing(shipping)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-semibold border-t pt-2 text-gray-900">
                <span>{t('orders.form.total')}</span>
                <span className="text-green-600">{formatPricing(total)}</span>
              </div>
            </div>

            {/* Pricing Source Indicator */}
            {pricingResult ? (
              <div className="text-xs text-gray-500 border-t pt-2">
                {t('orders.form.pricesCalculated')}
              </div>
            ) : (
              <div className="text-xs text-gray-500 border-t pt-2">
                {t('orders.form.basicCalculation')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}