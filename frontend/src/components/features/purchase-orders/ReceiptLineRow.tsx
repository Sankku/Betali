import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProductLots } from '@/hooks/useProductLots';
import type { ReceiptLine, PurchaseOrderDetail } from '@/types/purchaseOrders';

interface ReceiptLineRowProps {
  detail: PurchaseOrderDetail;
  value: Partial<ReceiptLine>;
  onChange: (value: Partial<ReceiptLine>) => void;
}

// The product_types relation is joined as the `product_types` table Row, not `products`.
// We use a local type to avoid `any` casts when reading the joined data.
type ProductTypeRelation = {
  name: string;
  sku: string;
  product_type_id: string;
};

function getProductType(detail: PurchaseOrderDetail): ProductTypeRelation | null {
  // detail.product_types is typed as Product (alias for products Row) due to
  // a type mismatch in purchaseOrders.ts, but at runtime the API returns
  // product_types Row data. We normalise it safely here.
  const pt = detail.product_types as unknown as ProductTypeRelation | null | undefined;
  return pt ?? null;
}

export function ReceiptLineRow({ detail, value, onChange }: ReceiptLineRowProps) {
  const remaining = detail.quantity - (detail.received_quantity || 0);
  const productType = getProductType(detail);
  const productName = productType?.name ?? detail.product_type_id;
  const hasExistingLot = !!detail.lot_id;

  // Only fetch lots when in 'existing' mode and there is no pre-assigned lot.
  const lotsEnabled = !hasExistingLot && value.lot?.mode === 'existing';
  const { data: existingLots = [] } = useProductLots(
    lotsEnabled ? detail.product_type_id : undefined,
  );

  const qty = value.received_quantity ?? remaining;
  const isZero = qty === 0;

  const handleQtyChange = (next: number) => {
    onChange({ ...value, received_quantity: next });
  };

  const handleModeChange = (mode: 'new' | 'existing') => {
    if (mode === 'new') {
      onChange({
        ...value,
        lot: {
          mode: 'new',
          lot_number: '',
          expiration_date: '',
          origin_country: '',
          price: detail.unit_price,
        },
      });
    } else {
      onChange({ ...value, lot: { mode: 'existing', lot_id: '' } });
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header: product info + quantity counters */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{productName}</p>
          {productType?.sku && (
            <p className="text-xs text-muted-foreground">SKU: {productType.sku}</p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Pedido: {detail.quantity}</p>
          <p>Ya recibido: {detail.received_quantity || 0}</p>
          <p className="font-medium text-foreground">Pendiente: {remaining}</p>
        </div>
      </div>

      {/* Quantity input */}
      <div>
        <Label className="text-xs">Cantidad a recibir (máx. {remaining})</Label>
        <Input
          type="number"
          min={0}
          max={remaining}
          value={qty}
          onChange={(e) => handleQtyChange(Number(e.target.value))}
          className="mt-1 w-32"
        />
      </div>

      {/* Lot assignment — dimmed when quantity is 0 */}
      <div className={isZero ? 'opacity-40 pointer-events-none' : ''}>
        {hasExistingLot ? (
          /* Line already has a lot from a prior partial reception — just display it */
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Lote: {detail.product_lot?.lot_number ?? detail.lot_id}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Vence: {detail.product_lot?.expiration_date ?? '—'}
            </span>
          </div>
        ) : (
          /* No lot yet — let the user pick new or existing */
          <div className="space-y-3">
            {/* Mode selector */}
            <div className="flex gap-4">
              {(['new', 'existing'] as const).map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-1.5 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name={`lot-mode-${detail.detail_id}`}
                    value={m}
                    checked={value.lot?.mode === m}
                    onChange={() => handleModeChange(m)}
                    className="accent-primary"
                  />
                  {m === 'new' ? 'Lote nuevo' : 'Lote existente'}
                </label>
              ))}
            </div>

            {/* New lot fields */}
            {value.lot?.mode === 'new' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Número de lote *</Label>
                  <Input
                    value={value.lot.lot_number}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        lot: { ...(value.lot as Extract<ReceiptLine['lot'], { mode: 'new' }>), lot_number: e.target.value },
                      })
                    }
                    placeholder="LOTE-2026-001"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vencimiento *</Label>
                  <Input
                    type="date"
                    value={value.lot.expiration_date}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        lot: { ...(value.lot as Extract<ReceiptLine['lot'], { mode: 'new' }>), expiration_date: e.target.value },
                      })
                    }
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">País de origen</Label>
                  <Input
                    value={value.lot.origin_country}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        lot: { ...(value.lot as Extract<ReceiptLine['lot'], { mode: 'new' }>), origin_country: e.target.value },
                      })
                    }
                    placeholder="AR"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Precio / unidad</Label>
                  <Input
                    type="number"
                    value={value.lot.price}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        lot: { ...(value.lot as Extract<ReceiptLine['lot'], { mode: 'new' }>), price: Number(e.target.value) },
                      })
                    }
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Existing lot selector */}
            {value.lot?.mode === 'existing' && (
              <div>
                <Label className="text-xs">Seleccionar lote *</Label>
                <Select
                  value={value.lot.lot_id}
                  onValueChange={(lot_id) =>
                    onChange({ ...value, lot: { mode: 'existing', lot_id } })
                  }
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Elegir lote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingLots.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        Sin lotes disponibles
                      </div>
                    ) : (
                      existingLots.map((lot) => (
                        <SelectItem key={lot.lot_id} value={lot.lot_id}>
                          {lot.lot_number} — vence {lot.expiration_date ?? '—'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
