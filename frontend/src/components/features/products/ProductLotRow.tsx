import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import type { ProductLot } from '../../../services/api/productLotsService';

interface ProductLotRowProps {
  lot: ProductLot;
  onEdit: (lot: ProductLot) => void;
  onDelete: (lot: ProductLot) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 30;
}

export const ProductLotRow: React.FC<ProductLotRowProps> = ({ lot, onEdit, onDelete }) => {
  const expired = isExpired(lot.expiration_date);
  const expiringSoon = isExpiringSoon(lot.expiration_date);

  const dateClass = expired
    ? 'text-danger-700 font-semibold'
    : expiringSoon
    ? 'text-warning-700 font-semibold'
    : 'text-neutral-600';

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-2.5 text-sm font-mono font-medium text-neutral-800">
        {lot.lot_number}
      </td>
      <td className="px-4 py-2.5 text-sm">
        <span className={dateClass}>
          {formatDate(lot.expiration_date)}
          {expired && <span className="ml-1.5 text-xs bg-danger-100 text-danger-700 px-1.5 py-0.5 rounded-full">Vencido</span>}
          {expiringSoon && !expired && <span className="ml-1.5 text-xs bg-warning-100 text-warning-700 px-1.5 py-0.5 rounded-full">Pronto</span>}
        </span>
      </td>
      <td className="px-4 py-2.5 text-sm text-neutral-600">
        {lot.warehouse_name
          ? <span className="font-medium text-neutral-800">{lot.warehouse_name}</span>
          : <span className="text-neutral-400 italic">Sin asignar</span>}
        {lot.origin_country && (
          <span className="block text-xs text-neutral-400">{lot.origin_country}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm font-semibold">
        <span className={lot.current_stock > 0 ? 'text-neutral-800' : 'text-neutral-400'}>
          {(lot.current_stock ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-4 py-2.5 text-sm font-semibold text-green-700">
        ${lot.price != null ? lot.price.toFixed(2) : '0.00'}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(lot)}
            className="h-7 w-7 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
            title="Editar lote"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(lot)}
            className="h-7 w-7 p-0 text-danger-500 hover:text-danger-700 hover:bg-danger-50"
            title="Eliminar lote"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
