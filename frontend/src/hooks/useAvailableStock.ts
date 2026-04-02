import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { productTypesService } from '../services/api/productTypesService';

export interface AvailableLot {
  lot_id: string;
  lot_number: string;
  expiration_date: string | null;
  available_stock: number;
}

export const useAvailableLots = (
  productTypeId?: string,
  warehouseId?: string
): UseQueryResult<AvailableLot[], Error> => {
  return useQuery<AvailableLot[], Error>({
    queryKey: ['available-lots', productTypeId, warehouseId],
    queryFn: () => productTypesService.getAvailableLots(productTypeId!, warehouseId!),
    enabled: !!productTypeId && !!warehouseId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

interface AvailableStockResponse {
  product_type_id: string;
  warehouse_id: string;
  organization_id: string;
  available_stock: number;
  timestamp: string;
}

/**
 * Hook to fetch available stock for a product in real-time
 * Available stock = Physical stock - Reserved stock
 *
 * @param productId - Product ID to check stock for
 * @param warehouseId - Warehouse ID to check stock in
 * @param options - Additional query options
 * @returns Query result with available stock data
 *
 * @example
 * ```tsx
 * const { data: stock, isLoading } = useAvailableStock(productId, warehouseId);
 *
 * if (stock && quantity > stock.available_stock) {
 *   // Show warning
 * }
 * ```
 */
export const useAvailableStock = (
  productTypeId?: string,
  warehouseId?: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
): UseQueryResult<AvailableStockResponse, Error> => {
  return useQuery<AvailableStockResponse, Error>({
    queryKey: ['available-stock', productTypeId, warehouseId],
    queryFn: () => {
      if (!productTypeId || !warehouseId) {
        throw new Error('Product type ID and Warehouse ID are required');
      }
      return productTypesService.getAvailableStock(productTypeId, warehouseId);
    },
    enabled: !!productTypeId && !!warehouseId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 30000, // 30 seconds cache (increased from 10s)
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
    refetchInterval: options?.refetchInterval, // Optional auto-refresh (disabled by default)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1, // Only retry once on error
  });
};

/**
 * Helper hook to check if stock is sufficient for a given quantity
 *
 * @param productId - Product ID
 * @param warehouseId - Warehouse ID
 * @param requestedQuantity - Quantity needed
 * @returns Object with stock status and messages
 *
 * @example
 * ```tsx
 * const { isSufficient, warning, error } = useStockValidation(
 *   productId,
 *   warehouseId,
 *   orderQuantity
 * );
 *
 * {warning && <Alert variant="warning">{warning}</Alert>}
 * {error && <Alert variant="error">{error}</Alert>}
 * ```
 */
export const useStockValidation = (
  productTypeId?: string,
  warehouseId?: string,
  requestedQuantity?: number
) => {
  const { data: stock, isLoading, error: queryError } = useAvailableStock(
    productTypeId,
    warehouseId
  );

  const availableStock = stock?.available_stock ?? 0;
  const quantity = requestedQuantity ?? 0;

  // Determine stock status
  const isSufficient = availableStock >= quantity;
  const isLowStock = availableStock > 0 && availableStock < 10; // Configurable threshold
  const isOutOfStock = availableStock === 0;

  // Generate messages
  let warning: string | null = null;
  let error: string | null = null;

  if (isLoading) {
    return { isSufficient: true, isLoading, warning: null, error: null, availableStock: 0 };
  }

  if (queryError) {
    error = 'No se pudo verificar el stock. Por favor, intente nuevamente.';
  } else if (isOutOfStock) {
    error = 'Producto sin stock';
  } else if (!isSufficient) {
    error = `Solo ${availableStock} ud. disponibles, pero intenta pedir ${quantity}.`;
  } else if (isLowStock && quantity > 0) {
    warning = `Bajo stock: Quedan ${availableStock} disponibles`;
  }

  return {
    isSufficient,
    isLowStock,
    isOutOfStock,
    isLoading,
    warning,
    error,
    availableStock,
  };
};
