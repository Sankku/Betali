import React from 'react';
import { Warehouse, Loader2 } from 'lucide-react';
import { useProductStockByWarehouse } from '../../../hooks/useProducts';

interface ProductStockBreakdownProps {
  productId: string | undefined;
  unit?: string;
}

/**
 * Table showing physical / reserved / available stock per warehouse.
 * Used in the product modal (view mode) and in the stock-by-warehouse popover.
 */
export const ProductStockBreakdown: React.FC<ProductStockBreakdownProps> = ({ productId, unit }) => {
  const { data, isLoading, error } = useProductStockByWarehouse(productId);

  if (!productId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500 py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando stock por depósito…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 py-2">
        Error al cargar el stock por depósito.
      </p>
    );
  }

  const warehouses = data?.warehouses ?? [];

  if (warehouses.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-2 italic">
        Sin movimientos registrados en ningún depósito.
      </p>
    );
  }

  const unitLabel = unit || 'unid.';

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 text-left">
            <th className="pb-2 pr-4 font-semibold text-neutral-700 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4" />
              Depósito
            </th>
            <th className="pb-2 pr-4 font-semibold text-neutral-700 text-right">Stock físico</th>
            <th className="pb-2 pr-4 font-semibold text-neutral-700 text-right">Reservado</th>
            <th className="pb-2 font-semibold text-neutral-700 text-right">Disponible</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map(row => (
            <tr key={row.warehouse_id} className="border-b border-neutral-100 last:border-0">
              <td className="py-2 pr-4">
                <span className="font-medium text-neutral-900">{row.warehouse_name}</span>
                {row.warehouse_location && (
                  <span className="block text-xs text-neutral-500">{row.warehouse_location}</span>
                )}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-neutral-700">
                {row.physical_stock} <span className="text-neutral-400 text-xs">{unitLabel}</span>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-orange-600">
                {row.reserved_stock > 0 ? `−${row.reserved_stock}` : '—'}
              </td>
              <td className="py-2 text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  row.available_stock === 0
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : row.available_stock <= 10
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {row.available_stock} {unitLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-300">
            <td className="pt-2 pr-4 font-semibold text-neutral-800">Total</td>
            <td className="pt-2 pr-4 text-right font-mono font-semibold text-neutral-800">
              {data?.total_physical ?? 0} <span className="text-neutral-400 text-xs font-normal">{unitLabel}</span>
            </td>
            <td className="pt-2 pr-4" />
            <td className="pt-2 text-right">
              <span className="font-semibold text-neutral-800 font-mono">
                {data?.total_available ?? 0} <span className="text-neutral-400 text-xs font-normal">{unitLabel}</span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
