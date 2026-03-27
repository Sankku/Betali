import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useStockValidation } from '@/hooks/useAvailableStock';

interface OrderItemWithStockValidationProps {
  item: {
    product_id: string;
    quantity: number;
    price: number;
  };
  index: number;
  warehouseId?: string;
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
    item.product_id,
    warehouseId,
    item.quantity
  );

  // Don't show validation if no product or warehouse selected
  const shouldShowValidation = item.product_id && warehouseId;

  return (
    <div className="space-y-2">
      <Label className="text-gray-900 font-medium">
        Cantidad *
        {shouldShowValidation && !isLoading && (
          <span className="ml-2 text-sm font-normal text-gray-600">
            ({availableStock} disponibles)
          </span>
        )}
      </Label>

      <Input
        type="number"
        value={item.quantity}
        onChange={(e) => onQuantityChange(index, 'quantity', e.target.value)}
        min="1"
        className={
          errors[`item_${index}_quantity`] || (!isSufficient && shouldShowValidation)
            ? 'border-red-500'
            : ''
        }
        disabled={isViewMode || isLoading}
      />

      {/* Stock validation messages */}
      {shouldShowValidation && !isLoading && (
        <>
          {/* Error: Insufficient stock or out of stock */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Warning: Low stock */}
          {warning && !error && (
            <Alert variant="warning">
              {warning}
            </Alert>
          )}

          {/* Success: Sufficient stock */}
          {isSufficient && !isLowStock && item.quantity > 0 && (
            <p className="text-sm text-green-600">
              ✓ Stock disponible
            </p>
          )}
        </>
      )}

      {/* Loading state */}
      {shouldShowValidation && isLoading && (
        <p className="text-sm text-gray-500">Comprobando stock...</p>
      )}

      {/* Form validation errors */}
      {errors[`item_${index}_quantity`] && (
        <p className="text-sm text-red-600 mt-1">
          {errors[`item_${index}_quantity`]}
        </p>
      )}
    </div>
  );
}
