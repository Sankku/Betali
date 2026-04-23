import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Package, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { useProductTypes } from '../../../hooks/useProductTypes';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { useProductLots, useCreateProductLot } from '../../../hooks/useProductLots';
import { useProductionPreview, useCreateProductionMovement } from '../../../hooks/useProductFormula';

interface ProductionMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type LotDestination = 'existing' | 'new';

export function ProductionMovementForm({ onSuccess, onCancel }: ProductionMovementFormProps) {
  const [form, setForm] = useState({
    finished_product_type_id: '',
    quantity_to_produce: '',
    warehouse_id: '',
    reference: '',
  });

  const [lotDestination, setLotDestination] = useState<LotDestination>('existing');
  const [existingLotId, setExistingLotId] = useState('');
  const [newLot, setNewLot] = useState({
    lot_number: '',
    expiration_date: '',
    price: '0',
  });

  const { data: productTypesData } = useProductTypes();
  const productTypes = productTypesData || [];
  const finishedGoods = productTypes.filter((p: any) => p.product_type === 'finished_good');

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data?.data || [];

  const { data: existingLots = [], isFetching: loadingLots } = useProductLots(
    form.finished_product_type_id || undefined
  );

  const { data: preview, isFetching: loadingPreview, isError: previewIsError, error: previewError } = useProductionPreview(
    form.finished_product_type_id || undefined,
    Number(form.quantity_to_produce) || 0,
    form.warehouse_id || undefined
  );

  const createProduction = useCreateProductionMovement();
  const createLot = useCreateProductLot();

  const showPreview = !!form.finished_product_type_id && Number(form.quantity_to_produce) > 0 && !!form.warehouse_id;

  const lotReady = lotDestination === 'existing'
    ? !!existingLotId
    : !!(newLot.lot_number.trim() && newLot.expiration_date);

  const canConfirm =
    !!form.finished_product_type_id &&
    !!form.quantity_to_produce &&
    !!form.warehouse_id &&
    lotReady &&
    !createProduction.isPending &&
    !createLot.isPending &&
    (showPreview ? preview?.can_produce !== false : true);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      let targetLotId: string | undefined;

      if (lotDestination === 'existing') {
        targetLotId = existingLotId;
      } else {
        // Create new lot first, then pass its id to the production movement
        const created = await createLot.mutateAsync({
          typeId: form.finished_product_type_id,
          data: {
            lot_number: newLot.lot_number.trim(),
            expiration_date: newLot.expiration_date,
            price: Number(newLot.price) || 0,
            warehouse_id: form.warehouse_id,
          },
        });
        targetLotId = created.lot_id;
      }

      await createProduction.mutateAsync({
        finished_product_type_id: form.finished_product_type_id,
        quantity_to_produce: Number(form.quantity_to_produce),
        warehouse_id: form.warehouse_id,
        reference: form.reference || undefined,
        target_lot_id: targetLotId,
      });
      onSuccess?.();
    } catch {
      // errors handled by mutation onError toasts
    }
  };

  const isPending = createProduction.isPending || createLot.isPending;

  return (
    <div className="space-y-4">
      {/* Producto */}
      <div>
        <label className="block text-sm font-medium mb-1">Producto a elaborar</label>
        <select
          required
          value={form.finished_product_type_id}
          onChange={(e) => {
            setForm(p => ({ ...p, finished_product_type_id: e.target.value }));
            setExistingLotId('');
            setLotDestination('existing');
          }}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar producto terminado...</option>
          {finishedGoods.map((p: any) => (
            <option key={p.product_type_id} value={p.product_type_id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Cantidad */}
      <div>
        <label className="block text-sm font-medium mb-1">Cantidad a producir</label>
        <input
          type="number"
          required
          min="0.0001"
          step="0.0001"
          value={form.quantity_to_produce}
          onChange={(e) => setForm(p => ({ ...p, quantity_to_produce: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="1"
        />
      </div>

      {/* Deposito */}
      <div>
        <label className="block text-sm font-medium mb-1">Deposito</label>
        <select
          required
          value={form.warehouse_id}
          onChange={(e) => setForm(p => ({ ...p, warehouse_id: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar deposito...</option>
          {(warehouses as any[]).map((w) => (
            <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Lote destino — solo cuando hay producto seleccionado */}
      {form.finished_product_type_id && (
        <div className="border rounded p-3 space-y-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium">Lote destino del producto elaborado</p>
          </div>

          {/* Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLotDestination('existing')}
              className={`flex-1 py-1.5 text-xs rounded border font-medium transition-colors ${
                lotDestination === 'existing'
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal-500'
              }`}
            >
              Lote existente
            </button>
            <button
              type="button"
              onClick={() => setLotDestination('new')}
              className={`flex-1 py-1.5 text-xs rounded border font-medium transition-colors ${
                lotDestination === 'new'
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal-500'
              }`}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Lote nuevo
            </button>
          </div>

          {/* Lote existente */}
          {lotDestination === 'existing' && (
            <div>
              {loadingLots ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando lotes...
                </div>
              ) : existingLots.length === 0 ? (
                <p className="text-xs text-amber-600">
                  No hay lotes creados para este producto. Usá "Lote nuevo".
                </p>
              ) : (
                <select
                  value={existingLotId}
                  onChange={(e) => setExistingLotId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar lote...</option>
                  {existingLots.map((lot: any) => (
                    <option key={lot.lot_id} value={lot.lot_id}>
                      {lot.lot_number} — vence {lot.expiration_date}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Lote nuevo */}
          {lotDestination === 'new' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Número de lote *</label>
                <input
                  type="text"
                  required
                  value={newLot.lot_number}
                  onChange={(e) => setNewLot(p => ({ ...p, lot_number: e.target.value }))}
                  placeholder="Ej: LOT-2026-001"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Fecha de vencimiento *</label>
                <input
                  type="date"
                  required
                  value={newLot.expiration_date}
                  onChange={(e) => setNewLot(p => ({ ...p, expiration_date: e.target.value }))}
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Precio de costo</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLot.price}
                  onChange={(e) => setNewLot(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referencia */}
      <div>
        <label className="block text-sm font-medium mb-1">Referencia (opcional)</label>
        <input
          type="text"
          value={form.reference}
          onChange={(e) => setForm(p => ({ ...p, reference: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Ej: OP-001"
        />
      </div>

      {/* Vista previa de consumo */}
      {showPreview && (
        <div className="border rounded p-3 space-y-2 bg-gray-50">
          <p className="text-sm font-medium">Vista previa de consumo:</p>

          {loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando stock...
            </div>
          ) : previewIsError ? (
            <p className="text-sm text-red-600">
              {(previewError as Error)?.message?.includes('No formula')
                ? 'Este producto no tiene fórmula de producción definida.'
                : (previewError as Error)?.message || 'Error al verificar stock.'}
            </p>
          ) : preview ? (
            <>
              {preview.materials_to_consume.map((m) => (
                <div key={m.product_type_id} className="flex items-center gap-2 text-sm">
                  {m.sufficient
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  }
                  <span className="flex-1">{m.name}</span>
                  <span className={m.sufficient ? 'text-green-700' : 'text-red-700'}>
                    Req: {m.quantity_required} / Disp: {m.current_stock}
                  </span>
                </div>
              ))}
              {!preview.can_produce && (
                <p className="text-sm text-red-600 font-medium">
                  Stock insuficiente para completar la elaboracion.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
            </span>
          ) : 'Confirmar Elaboracion'}
        </Button>
      </div>
    </div>
  );
}
