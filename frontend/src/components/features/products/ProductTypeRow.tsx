import React, { useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { ProductLotRow } from './ProductLotRow';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { ProductType } from '../../../services/api/productTypesService';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductTypeRowProps {
  productType: ProductType;
  lots: ProductLot[];
  lotsLoading: boolean;
  isExpanded: boolean;
  lotSearch?: string;
  warehouseFilter?: string;
  lotCreatedFrom?: string;
  lotCreatedTo?: string;
  lotExpirationFrom?: string;
  lotExpirationTo?: string;
  canSeePrices?: boolean;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  onToggle: () => void;
  onAutoExpand: () => void;
  onEditType: (productType: ProductType) => void;
  onDeleteType: (productType: ProductType) => void;
  onAddLot: (productType: ProductType) => void;
  onEditLot: (lot: ProductLot, productType: ProductType) => void;
  onDeleteLot: (lot: ProductLot) => void;
}

const TYPE_STYLES: Record<string, string> = {
  standard: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  raw_material: 'bg-blue-100 text-blue-700 border-blue-300',
  finished_good: 'bg-purple-100 text-purple-700 border-purple-300',
};

export const ProductTypeRow: React.FC<ProductTypeRowProps> = ({
  productType,
  lots,
  lotsLoading,
  isExpanded,
  lotSearch,
  warehouseFilter,
  lotCreatedFrom,
  lotCreatedTo,
  lotExpirationFrom,
  lotExpirationTo,
  canSeePrices = false,
  isSelected = false,
  onSelect,
  onToggle,
  onAutoExpand,
  onEditType,
  onDeleteType,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) => {
  const { t } = useTranslation();

  const lotCount = lots.length;
  const totalStock = lots.reduce((sum, l) => sum + (l.current_stock ?? 0), 0);

  // Filter lots by all active lot-level filters
  const visibleLots = (lots ?? []).filter(l => {
    if (lotSearch && !l.lot_number.toLowerCase().includes(lotSearch.toLowerCase())) return false;
    if (warehouseFilter && l.warehouse_id !== warehouseFilter) return false;
    // created_at is an ISO timestamp — compare date portion only
    if (lotCreatedFrom && l.created_at.slice(0, 10) < lotCreatedFrom) return false;
    if (lotCreatedTo && l.created_at.slice(0, 10) > lotCreatedTo) return false;
    // expiration_date is stored as YYYY-MM-DD
    if (lotExpirationFrom && l.expiration_date < lotExpirationFrom) return false;
    if (lotExpirationTo && l.expiration_date > lotExpirationTo) return false;
    return true;
  });

  // Hide this row if no lots match the active filters.
  // typeMatchesSearch is true only when the lot text search also matches the product
  // name/SKU — that keeps the row visible even if its lots don't match the text.
  // Date-only filters have no concept of "the type itself matches", so we use false,
  // which lets the row be hidden whenever visibleLots is empty.
  const typeMatchesSearch = lotSearch
    ? productType.name.toLowerCase().includes(lotSearch.toLowerCase()) ||
      productType.sku.toLowerCase().includes(lotSearch.toLowerCase())
    : false;
  const hasActiveFilter = !!(lotSearch || warehouseFilter || lotCreatedFrom || lotCreatedTo || lotExpirationFrom || lotExpirationTo);
  const hidden = hasActiveFilter && !typeMatchesSearch && visibleLots.length === 0;

  // Auto-expand when any lot filter produces matches in this row
  useEffect(() => {
    if (hasActiveFilter && visibleLots.length > 0 && !isExpanded) {
      onAutoExpand();
    }
  }, [hasActiveFilter, visibleLots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const TYPE_LABEL_KEYS: Record<string, string> = {
    standard: t('products.sidePanel.typeStandard'),
    raw_material: t('products.sidePanel.typeRawMaterial'),
    finished_good: t('products.sidePanel.typeFinishedGood'),
  };

  const typeStyle = TYPE_STYLES[productType.product_type] || TYPE_STYLES.standard;
  const typeLabel = TYPE_LABEL_KEYS[productType.product_type] || productType.product_type;

  if (hidden) return null;

  return (
    <>
      {/* Type header row */}
      <tr
        className={`border-b border-neutral-200 cursor-pointer transition-colors ${
          isSelected ? 'bg-primary-50' : isExpanded ? 'bg-primary-50/60' : 'hover:bg-neutral-50'
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 w-8" onClick={e => e.stopPropagation()}>
          {onSelect ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => onSelect(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          ) : null}
        </td>
        <td className="px-4 py-3 w-8">
          <span className="text-neutral-400">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-mono font-semibold text-neutral-800">
          {productType.sku}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
          {productType.name}
          {productType.description && (
            <p className="text-xs text-neutral-400 font-normal mt-0.5 truncate max-w-xs">
              {productType.description}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeStyle}`}
          >
            {typeLabel}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-neutral-500 font-mono">
          {productType.unit}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-neutral-800">{lotCount}</span>
            <span className="text-xs text-neutral-400">lotes</span>
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600">
          {lotsLoading ? (
            <span className="text-neutral-400">—</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-neutral-800">{totalStock.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              <span className="text-xs text-neutral-400 font-mono">{productType.unit}</span>
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-green-700">
          {productType.sale_price != null
            ? `$${productType.sale_price.toFixed(2)}`
            : <span className="text-neutral-400 font-normal">—</span>}
        </td>
        {canSeePrices && (
          <td className="px-4 py-3 text-sm font-semibold text-blue-700">
            {productType.purchase_price != null
              ? `$${productType.purchase_price.toFixed(2)}`
              : <span className="text-neutral-400 font-normal">—</span>}
          </td>
        )}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddLot(productType)}
              className="h-7 px-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 text-xs gap-1"
              title="Agregar lote"
            >
              <Plus className="h-3.5 w-3.5" />
              Lote
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditType(productType)}
              className="h-7 w-7 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
              title="Editar tipo"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteType(productType)}
              className="h-7 w-7 p-0 text-danger-500 hover:text-danger-700 hover:bg-danger-50"
              title="Eliminar tipo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded lots section */}
      {isExpanded && (
        <tr>
          <td colSpan={canSeePrices ? 11 : 10} className="p-0 bg-neutral-50 border-b border-neutral-200">
            {lotsLoading ? (
              <div className="flex items-center gap-2 px-10 py-4 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando lotes...
              </div>
            ) : lotCount === 0 ? (
              <div className="px-10 py-4 text-sm text-neutral-400 italic">
                Sin lotes.{' '}
                <button
                  onClick={() => onAddLot(productType)}
                  className="text-primary-600 hover:underline font-medium"
                >
                  Agregar el primero
                </button>
              </div>
            ) : visibleLots.length === 0 ? (
              <div className="px-10 py-4 text-sm text-neutral-400 italic">
                Sin lotes que coincidan con la búsqueda.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-2 pl-10 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Lote
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Fabricado
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Vence
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Almacén
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Stock
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Precio venta
                    </th>
                    {canSeePrices && (
                      <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Precio compra
                      </th>
                    )}
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLots.map(lot => (
                    <ProductLotRow
                      key={lot.lot_id}
                      lot={lot}
                      canSeeLotPrice={canSeePrices}
                      onEdit={l => onEditLot(l, productType)}
                      onDelete={onDeleteLot}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
};
