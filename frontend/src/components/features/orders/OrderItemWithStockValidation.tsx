import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStockValidation } from '@/hooks/useAvailableStock';
import { useTranslation } from '@/contexts/LanguageContext';

interface OrderItemWithStockValidationProps {
  item: {
    product_type_id: string;
    quantity: number;
    price: number;
  };
  index: number;
  warehouseId?: string;
  minStock?: number | null;
  maxStock?: number | null;
  onQuantityChange: (index: number, field: string, value: string) => void;
  errors?: Record<string, string>;
  isViewMode?: boolean;
}

/**
 * Order item quantity input with real-time stock validation
 * Shows warnings and errors based on available stock
 */
export function OrderItemWithStockValidation({
  item,
  index,
  warehouseId,
  minStock,
  maxStock,
  onQuantityChange,
  errors = {},
  isViewMode = false,
}: OrderItemWithStockValidationProps) {
  // Get stock validation status
  const {
    isSufficient,
    isLowStock,
    isOutOfStock,
    isLoading,
    warning,
    error,
    availableStock,
  } = useStockValidation(
    item.product_type_id,
    warehouseId,
    item.quantity,
    { minStock, maxStock }
  );

  const { t } = useTranslation();

  // Don't show validation if no product or warehouse selected
  const shouldShowValidation = item.product_type_id && warehouseId;

  return (
    <div className="space-y-1.5">
      <Label className="text-gray-900 font-medium">{t('common.quantity')} *</Label>

      <Input
        type="number"
        value={item.quantity === 0 ? '' : item.quantity}
        placeholder="1"
        onChange={(e) => onQuantityChange(index, 'quantity', e.target.value)}
        min="1"
        className={
          errors[`item_${index}_quantity`] || (!isSufficient && shouldShowValidation)
            ? 'border-red-500'
            : ''
        }
        disabled={isViewMode || isLoading}
      />

      {/* Compact inline stock status — single line below input */}
      {shouldShowValidation && !isLoading && (
        <div className="flex items-center gap-1 text-xs min-h-[16px]">
          {error ? (
            <>
              <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <span className="text-red-600 truncate" title={error}>
                {t('orders.form.stockError', { available: availableStock, requested: item.quantity })}
              </span>
            </>
          ) : warning ? (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="text-amber-600">{t('orders.form.stockLow', { count: availableStock })}</span>
            </>
          ) : isSufficient && !isLowStock && item.quantity > 0 ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="text-green-600">{t('orders.form.stockAvailable', { count: availableStock })}</span>
            </>
          ) : (
            <span className="text-neutral-400">{t('orders.form.stockAvailable', { count: availableStock })}</span>
          )}
        </div>
      )}

      {/* Loading state */}
      {shouldShowValidation && isLoading && (
        <p className="text-xs text-neutral-400">{t('orders.form.stockChecking')}</p>
      )}

      {/* Form validation errors */}
      {errors[`item_${index}_quantity`] && (
        <p className="text-xs text-red-600">{errors[`item_${index}_quantity`]}</p>
      )}
    </div>
  );
}
