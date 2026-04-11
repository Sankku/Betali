import React, { useMemo, useState } from 'react';
import { ProductTypeRow } from './ProductTypeRow';
import { TooltipHelp } from '../../ui/tooltip-help';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAllProductLots } from '../../../hooks/useProductLots';
import type { ProductType } from '../../../services/api/productTypesService';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductTypeAccordionProps {
  productTypes: ProductType[];
  lotSearch?: string;
  warehouseFilter?: string;
  canSeePrices?: boolean;
  selectedIds?: Set<string>;
  onSelectOne?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onEditType: (productType: ProductType) => void;
  onDeleteType: (productType: ProductType) => void;
  onAddLot: (productType: ProductType) => void;
  onEditLot: (lot: ProductLot, productType: ProductType) => void;
  onDeleteLot: (lot: ProductLot) => void;
}

export const ProductTypeAccordion: React.FC<ProductTypeAccordionProps> = ({
  productTypes,
  lotSearch,
  warehouseFilter,
  canSeePrices = false,
  selectedIds = new Set(),
  onSelectOne,
  onSelectAll,
  onEditType,
  onDeleteType,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) => {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: allLots, isLoading: lotsLoading } = useAllProductLots();

  // Group all lots by product_type_id once — O(n) — each row gets its slice
  const lotsByTypeId = useMemo(() => {
    const map = new Map<string, ProductLot[]>();
    for (const lot of allLots ?? []) {
      const existing = map.get(lot.product_type_id);
      if (existing) {
        existing.push(lot);
      } else {
        map.set(lot.product_type_id, [lot]);
      }
    }
    return map;
  }, [allLots]);

  const allSelected = productTypes.length > 0 && productTypes.every(pt => selectedIds.has(pt.product_type_id));
  const someSelected = productTypes.some(pt => selectedIds.has(pt.product_type_id)) && !allSelected;

  const toggleRow = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 w-8">
              {onSelectAll && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={e => onSelectAll(e.target.checked)}
                  onClick={e => e.stopPropagation()}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
              )}
            </th>
            <th className="px-4 py-3 w-8" />
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              <span className="flex items-center gap-1">
                {t('products.table.colSku')}
                <TooltipHelp content={t('products.table.skuTooltip')} position="bottom" />
              </span>
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colName')}
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colType')}
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colUnit')}
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colLots')}
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colTotalStock')}
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colSalePrice')}
            </th>
            {canSeePrices && (
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {t('products.table.colPurchasePrice')}
              </th>
            )}
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t('products.table.colActions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {productTypes.map(pt => (
            <ProductTypeRow
              key={pt.product_type_id}
              productType={pt}
              lots={lotsByTypeId.get(pt.product_type_id) ?? []}
              lotsLoading={lotsLoading}
              isExpanded={expandedIds.has(pt.product_type_id)}
              lotSearch={lotSearch}
              warehouseFilter={warehouseFilter}
              canSeePrices={canSeePrices}
              isSelected={selectedIds.has(pt.product_type_id)}
              onSelect={onSelectOne ? (checked) => onSelectOne(pt.product_type_id, checked) : undefined}
              onToggle={() => toggleRow(pt.product_type_id)}
              onAutoExpand={() => setExpandedIds(prev => new Set([...prev, pt.product_type_id]))}
              onEditType={onEditType}
              onDeleteType={onDeleteType}
              onAddLot={onAddLot}
              onEditLot={onEditLot}
              onDeleteLot={onDeleteLot}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
