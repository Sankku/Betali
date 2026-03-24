import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useProducts } from '../../../hooks/useProducts';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { useProductionPreview, useCreateProductionMovement } from '../../../hooks/useProductFormula';

interface ProductionMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductionMovementForm({ onSuccess, onCancel }: ProductionMovementFormProps) {
  const [form, setForm] = useState({
    finished_product_id: '',
    quantity_to_produce: '',
    warehouse_id: '',
    reference: '',
  });

  const { data: productsResult } = useProducts();
  const allProducts = productsResult?.data || [];
  const finishedGoods = allProducts.filter((p: any) => p.product_type === 'finished_good');

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data?.data || [];

  const { data: preview, isFetching: loadingPreview } = useProductionPreview(
    form.finished_product_id || undefined,
    Number(form.quantity_to_produce) || 0,
    form.warehouse_id || undefined
  );

  const createProduction = useCreateProductionMovement();

  const handleConfirm = async () => {
    if (!preview?.can_produce) return;
    try {
      await createProduction.mutateAsync({
        finished_product_id: form.finished_product_id,
        quantity_to_produce: Number(form.quantity_to_produce),
        warehouse_id: form.warehouse_id,
        reference: form.reference || undefined,
      });
      onSuccess?.();
    } catch {
      // error handled by mutation's onError toast
    }
  };

  const showPreview = !!form.finished_product_id && Number(form.quantity_to_produce) > 0 && !!form.warehouse_id;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Producto a elaborar</label>
        <select
          required
          value={form.finished_product_id}
          onChange={(e) => setForm(p => ({ ...p, finished_product_id: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar producto terminado...</option>
          {finishedGoods.map((p: any) => (
            <option key={p.product_id} value={p.product_id}>{p.name}</option>
          ))}
        </select>
      </div>

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

      {showPreview && (
        <div className="border rounded p-3 space-y-2 bg-gray-50">
          <p className="text-sm font-medium">Vista previa de consumo:</p>

          {loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando stock...
            </div>
          ) : preview ? (
            <>
              {preview.materials_to_consume.map((m) => {
                const unit = (allProducts as any[]).find(p => p.product_id === m.product_id)?.unit || '';
                return (
                  <div key={m.product_id} className="flex items-center gap-2 text-sm">
                    {m.sufficient
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <span className="flex-1">{m.name}</span>
                    {unit && (
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        {unit}
                      </span>
                    )}
                    <span className={m.sufficient ? 'text-green-700' : 'text-red-700'}>
                      Req: {m.quantity_required} / Disp: {m.current_stock}
                    </span>
                  </div>
                );
              })}
              {!preview.can_produce && (
                <p className="text-sm text-red-600 font-medium">
                  Stock insuficiente para completar la elaboracion.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={createProduction.isPending || !form.finished_product_id || !form.quantity_to_produce || !form.warehouse_id || (showPreview && preview !== undefined && !preview?.can_produce)}
        >
          {createProduction.isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
            </span>
          ) : 'Confirmar Elaboracion'}
        </Button>
      </div>
    </div>
  );
}
