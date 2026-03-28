import React, { useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { ProductLotRow } from './ProductLotRow';
import { useProductLots } from '../../../hooks/useProductLots';
import type { ProductType } from '../../../services/api/productTypesService';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductTypeRowProps {
  productType: ProductType;
  isExpanded: boolean;
  lotSearch?: string;
  onToggle: () => void;
  onAutoExpand: () => void;
  onEditType: (productType: ProductType) => void;
  onDeleteType: (productType: ProductType) => void;
  onAddLot: (productType: ProductType) => void;
  onEditLot: (lot: ProductLot, productType: ProductType) => void;
  onDeleteLot: (lot: ProductLot) => void;
}

const TYPE_LABELS: Record<string, string> = {
  standard: 'Estandar',
  raw_material: 'Mat. Prima',
  finished_good: 'Terminado',
};

const TYPE_STYLES: Record<string, string> = {
  standard: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  raw_material: 'bg-blue-100 text-blue-700 border-blue-300',
  finished_good: 'bg-purple-100 text-purple-700 border-purple-300',
};

export const ProductTypeRow: React.FC<ProductTypeRowProps> = ({
  productType,
  isExpanded,
  lotSearch,
  onToggle,
  onAutoExpand,
  onEditType,
  onDeleteType,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) => {
  // Always fetch lots so the count is visible even when collapsed.
  // TanStack Query caches per typeId, so expanding is instant.
  const { data: lots, isLoading: lotsLoading } = useProductLots(productType.product_type_id);

  const lotCount = lots?.length ?? 0;

  // Filter lots by lot_number when lotSearch is active
  const visibleLots = lotSearch
    ? (lots ?? []).filter(l => l.lot_number.toLowerCase().includes(lotSearch.toLowerCase()))
    : (lots ?? []);

  // When searching, hide this row if neither the type nor any lot matches
  const typeMatchesSearch = lotSearch
    ? productType.name.toLowerCase().includes(lotSearch.toLowerCase()) ||
      productType.sku.toLowerCase().includes(lotSearch.toLowerCase())
    : true;
  const hidden = !!lotSearch && !typeMatchesSearch && visibleLots.length === 0;

  // Auto-expand when lotSearch produces matches in this row
  useEffect(() => {
    if (lotSearch && visibleLots.length > 0 && !isExpanded) {
      onAutoExpand();
    }
  }, [lotSearch, visibleLots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeStyle = TYPE_STYLES[productType.product_type] || TYPE_STYLES.standard;
  const typeLabel = TYPE_LABELS[productType.product_type] || productType.product_type;

  if (hidden) return null;

  return (
    <>
      {/* Type header row */}
      <tr
        className={`border-b border-neutral-200 cursor-pointer transition-colors ${
          isExpanded ? 'bg-primary-50' : 'hover:bg-neutral-50'
        }`}
        onClick={onToggle}
      >
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
          <td colSpan={7} className="p-0 bg-neutral-50 border-b border-neutral-200">
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
                      Vence
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Origen
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Precio
                    </th>
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
