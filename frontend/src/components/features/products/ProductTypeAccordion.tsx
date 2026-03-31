import React, { useState } from 'react';
import { ProductTypeRow } from './ProductTypeRow';
import { TooltipHelp } from '../../ui/tooltip-help';
import type { ProductType } from '../../../services/api/productTypesService';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductTypeAccordionProps {
  productTypes: ProductType[];
  lotSearch?: string;
  onEditType: (productType: ProductType) => void;
  onDeleteType: (productType: ProductType) => void;
  onAddLot: (productType: ProductType) => void;
  onEditLot: (lot: ProductLot, productType: ProductType) => void;
  onDeleteLot: (lot: ProductLot) => void;
}

export const ProductTypeAccordion: React.FC<ProductTypeAccordionProps> = ({
  productTypes,
  lotSearch,
  onEditType,
  onDeleteType,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) => {
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
                SKU
                <TooltipHelp content="Identificador único del producto (ej: HAR-001). Se usa para buscarlo y referenciarlo en el sistema." position="bottom" />
              </span>
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Nombre
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Tipo
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Unidad
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Lotes
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Stock Total
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Acciones
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
