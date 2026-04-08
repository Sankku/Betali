import React, { useState } from 'react';
import { ProductTypeRow } from './ProductTypeRow';
import { TooltipHelp } from '../../ui/tooltip-help';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { ProductType } from '../../../services/api/productTypesService';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductTypeAccordionProps {
  productTypes: ProductType[];
  lotSearch?: string;
  warehouseFilter?: string;
  canSeePrices?: boolean;
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
  onEditType,
  onDeleteType,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) => {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
              isExpanded={expandedIds.has(pt.product_type_id)}
              lotSearch={lotSearch}
              warehouseFilter={warehouseFilter}
              canSeePrices={canSeePrices}
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
