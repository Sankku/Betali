import { useState } from 'react';
import { Trash, Plus, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useProducts } from '../../../hooks/useProducts';
import {
  useProductFormula,
  useAddFormulaItem,
  useUpdateFormulaItem,
  useDeleteFormulaItem,
} from '../../../hooks/useProductFormula';

interface ProductFormulaEditorProps {
  finishedProductId: string;
}

export function ProductFormulaEditor({ finishedProductId }: ProductFormulaEditorProps) {
  const [newItem, setNewItem] = useState({ raw_material_id: '', quantity_required: '' });

  const { data: formula = [], isLoading, error: formulaError } = useProductFormula(finishedProductId);
  const { data: productsResult } = useProducts();
  const allProducts = productsResult?.data || [];
  const rawMaterials = allProducts.filter((p: any) => p.product_type === 'raw_material');

  const addItem = useAddFormulaItem();
  const updateItem = useUpdateFormulaItem(finishedProductId);
  const deleteItem = useDeleteFormulaItem(finishedProductId);

  const handleAdd = async () => {
    if (!newItem.raw_material_id || !newItem.quantity_required) return;
    await addItem.mutateAsync({
      finished_product_id: finishedProductId,
      raw_material_id: newItem.raw_material_id,
      quantity_required: Number(newItem.quantity_required),
    });
    setNewItem({ raw_material_id: '', quantity_required: '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando fórmula...
      </div>
    );
  }

  if (formulaError) {
    return (
      <div className="text-sm text-red-500">
        Error cargando fórmula: {(formulaError as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Fórmula BOM (componentes requeridos)</h4>

      {formula.length === 0 && (
        <p className="text-sm text-gray-400 italic">Sin componentes definidos.</p>
      )}

      <ul className="space-y-2">
        {formula.map((item) => (
          <li key={item.formula_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm">
              {item.raw_material?.name || item.raw_material_id}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                defaultValue={item.quantity_required}
                className="w-20 border rounded px-2 py-1 text-sm"
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0 && val !== item.quantity_required) {
                    updateItem.mutate({ formulaId: item.formula_id, quantity_required: val });
                  }
                }}
              />
              {item.raw_material?.unit && (
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                  {item.raw_material.unit}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteItem.mutate(item.formula_id)}
              disabled={deleteItem.isPending}
            >
              <Trash className="w-4 h-4 text-red-500" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 pt-2 border-t">
        <select
          value={newItem.raw_material_id}
          onChange={(e) => setNewItem(p => ({ ...p, raw_material_id: e.target.value }))}
          className="flex-1 border rounded px-2 py-1 text-sm"
        >
          <option value="">Seleccionar materia prima...</option>
          {rawMaterials.map((p: any) => (
            <option key={p.product_id} value={p.product_id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="Cantidad"
          value={newItem.quantity_required}
          onChange={(e) => setNewItem(p => ({ ...p, quantity_required: e.target.value }))}
          className="w-24 border rounded px-2 py-1 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.raw_material_id || !newItem.quantity_required || addItem.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
