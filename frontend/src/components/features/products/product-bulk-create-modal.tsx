import React, { useCallback, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Rows3, Plus, Trash2, Copy } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../ui/modal';
import { Button } from '../../ui/button';
import { useProductTypeImport } from '../../../hooks/useProductTypes';
import { useWarehouses } from '../../../hooks/useWarehouse';
import type { BulkImportResult } from '../../../services/api/productTypesService';
import {
  validateRow,
  emptyRow,
  VALID_UNITS,
  VALID_PRODUCT_TYPES,
  type ParsedRow,
} from './_productValidation';

const INITIAL_ROWS = 3;

export interface ProductBulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'grid' | 'result';

export const ProductBulkCreateModal: React.FC<ProductBulkCreateModalProps> = ({ isOpen, onClose }) => {
  const { data: warehousesData } = useWarehouses();
  const warehouseNames = (warehousesData?.data ?? []).map((w: { name: string }) =>
    String(w.name).toLowerCase().trim()
  );

  const makeEmpty = useCallback(
    (rowNum: number) => emptyRow(rowNum, warehouseNames),
    [warehouseNames]
  );

  const [step, setStep] = useState<Step>('grid');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, (_, i) => emptyRow(i + 1, []))
  );
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [confirmPartial, setConfirmPartial] = useState(false);

  const importMutation = useProductTypeImport();

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleClose = useCallback(() => {
    setStep('grid');
    setParsedRows(Array.from({ length: INITIAL_ROWS }, (_, i) => makeEmpty(i + 1)));
    setImportResult(null);
    setConfirmPartial(false);
    onClose();
  }, [onClose, makeEmpty]);

  const handleCellChange = useCallback(
    (rowIndex: number, field: string, value: string) => {
      setParsedRows((prev) => {
        const next = [...prev];
        const row = next[rowIndex];
        const newData = { ...row.data, [field]: value } as unknown as Record<string, string>;
        next[rowIndex] = validateRow(newData, row.rowNum, warehouseNames);
        return next;
      });
    },
    [warehouseNames]
  );

  const handleAddRow = useCallback(() => {
    setParsedRows((prev) => [...prev, makeEmpty(prev.length + 1)]);
  }, [makeEmpty]);

  const handleDeleteRow = useCallback((index: number) => {
    setParsedRows((prev) =>
      prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, rowNum: i + 1 }))
    );
  }, []);

  const handleDuplicateRow = useCallback(
    (index: number) => {
      setParsedRows((prev) => {
        const source = prev[index];
        const clone: ParsedRow = {
          ...source,
          rowNum: prev.length + 1,
        };
        return [...prev, clone];
      });
    },
    []
  );

  const handleCreate = async () => {
    if (validRows.length === 0) return;
    if (invalidRows.length > 0 && !confirmPartial) {
      setConfirmPartial(true);
      return;
    }
    setConfirmPartial(false);
    try {
      const result = await importMutation.mutateAsync(validRows.map((r) => r.data));
      setImportResult(result);
      setStep('result');
    } catch {
      // error surfaced via mutation state
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <Rows3 className="h-5 w-5" />
          <span>Crear productos en masa</span>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Step 1: Grid */}
        {step === 'grid' && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 text-sm flex-wrap items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 px-3 py-1.5 rounded-lg font-medium">
                  <CheckCircle className="h-4 w-4" /> {validRows.length} válidas
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 px-3 py-1.5 rounded-lg font-medium">
                    <XCircle className="h-4 w-4" /> {invalidRows.length} con errores
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">#</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">SKU</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Nro Lote</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">País Origen</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Precio</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Stock In.</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Unidad</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Vencimiento</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Depósito</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-400">Estado</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {parsedRows.map((row, index) => (
                    <tr
                      key={index}
                      className={`${row.errors.length > 0 ? 'bg-danger-50 dark:bg-danger-500/5 hover:bg-danger-100 dark:hover:bg-danger-500/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'} transition-colors`}
                    >
                      <td className="px-4 py-2.5 text-neutral-400 dark:text-neutral-500 align-top whitespace-nowrap pt-3">{row.rowNum}</td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <input
                          type="text"
                          value={row.data.sku || ''}
                          onChange={(e) => handleCellChange(index, 'sku', e.target.value)}
                          placeholder="SKU"
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('SKU')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-[110px] transition-all font-mono font-medium text-neutral-700 dark:text-neutral-300`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <input
                          type="text"
                          value={row.data.lot_number || ''}
                          onChange={(e) => handleCellChange(index, 'lot_number', e.target.value)}
                          placeholder="Lote"
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('nro de lote')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-[120px] transition-all font-medium text-neutral-700 dark:text-neutral-300`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="text"
                          value={row.data.name || ''}
                          onChange={(e) => handleCellChange(index, 'name', e.target.value)}
                          placeholder="Nombre"
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('nombre')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-full min-w-[150px] transition-all font-medium text-neutral-800 dark:text-neutral-200`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <input
                          type="text"
                          value={row.data.origin_country || ''}
                          onChange={(e) => handleCellChange(index, 'origin_country', e.target.value)}
                          placeholder="País"
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('país de origen')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-[100px] transition-all text-neutral-700 dark:text-neutral-300`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-neutral-400 pointer-events-none">$</span>
                          <input
                            type="text"
                            value={row.data.price || ''}
                            onChange={(e) => handleCellChange(index, 'price', e.target.value)}
                            placeholder="0"
                            className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('precio')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md pl-6 pr-2 py-1 outline-none w-[90px] transition-all text-neutral-600 dark:text-neutral-400`}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <input
                          type="text"
                          value={row.data.initial_stock || ''}
                          onChange={(e) => handleCellChange(index, 'initial_stock', e.target.value)}
                          placeholder="0"
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('stock inicial')) ? 'border-danger-300 dark:border-danger-500/50 text-danger-700 dark:text-danger-400' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-[70px] transition-all text-right text-neutral-600 dark:text-neutral-400`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <select
                          value={row.data.unit || 'unidad'}
                          onChange={(e) => handleCellChange(index, 'unit', e.target.value)}
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('unidad de medida')) ? 'border-danger-400 dark:border-danger-500/50 text-danger-700 dark:text-danger-400' : 'border-transparent text-neutral-600 dark:text-neutral-400'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-1 py-1 outline-none min-w-[80px] w-full transition-all text-xs cursor-pointer capitalize font-mono`}
                        >
                          {row.data.unit && !VALID_UNITS.includes(row.data.unit) && (
                            <option value={row.data.unit}>{row.data.unit} (Inválido)</option>
                          )}
                          {VALID_UNITS.map((u) => (
                            <option key={u} value={u} className="text-neutral-900 dark:text-neutral-100">{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <select
                          value={row.data.product_type || ''}
                          onChange={(e) => handleCellChange(index, 'product_type', e.target.value)}
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('tipo')) ? 'border-danger-400 dark:border-danger-500/50 text-danger-700 dark:text-danger-400' : 'border-transparent text-neutral-600 dark:text-neutral-400'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-1 py-1 outline-none min-w-[120px] w-full transition-all text-xs cursor-pointer capitalize`}
                        >
                          <option value="">(Estándar)</option>
                          {row.data.product_type && !VALID_PRODUCT_TYPES.includes(row.data.product_type) && (
                            <option value={row.data.product_type}>{row.data.product_type} (Inválido)</option>
                          )}
                          <option value="standard" className="text-neutral-900 dark:text-neutral-100">Estándar</option>
                          <option value="raw_material" className="text-neutral-900 dark:text-neutral-100">Materia Prima</option>
                          <option value="finished_good" className="text-neutral-900 dark:text-neutral-100">Producto Terminado</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <input
                          type="date"
                          value={row.data.expiration_date || ''}
                          onChange={(e) => handleCellChange(index, 'expiration_date', e.target.value)}
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.errors.some(e => e.includes('vencimiento')) ? 'border-danger-300 dark:border-danger-500/50' : 'border-transparent'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-2 py-1 outline-none w-[110px] transition-all text-neutral-500 dark:text-neutral-500 text-xs`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <select
                          value={row.data.warehouse_name || ''}
                          onChange={(e) => handleCellChange(index, 'warehouse_name', e.target.value)}
                          className={`bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border ${row.warnings.some(w => w.includes('Depósito') || w.includes('depósito')) ? 'border-warning-400 dark:border-warning-500/50 text-warning-700 dark:text-warning-400' : 'border-transparent text-neutral-600 dark:text-neutral-400'} focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md px-1 py-1 outline-none min-w-[140px] w-full transition-all text-xs cursor-pointer truncate`}
                        >
                          <option value="">(Org default)</option>
                          {row.data.warehouse_name && !warehouseNames.includes(row.data.warehouse_name.toLowerCase().trim()) && (
                            <option value={row.data.warehouse_name}>{row.data.warehouse_name} (Inválido)</option>
                          )}
                          {warehousesData?.data?.map((w: { warehouse_id?: string; id?: string; name: string }) => (
                            <option key={w.warehouse_id ?? w.id} value={w.name} className="text-neutral-900 dark:text-neutral-100">{w.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 align-top min-w-[160px] pt-3">
                        {row.errors.length > 0 ? (
                          <span className="text-danger-600 dark:text-danger-400 flex items-start gap-1.5 font-medium">
                            <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            {row.errors[0]}{row.errors.length > 1 ? ` +${row.errors.length - 1}` : ''}
                          </span>
                        ) : row.warnings.length > 0 ? (
                          <span className="text-warning-600 dark:text-warning-500 flex items-start gap-1.5 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            {row.warnings[0]}
                          </span>
                        ) : (
                          <span className="text-success-600 dark:text-success-500 flex items-center gap-1.5 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> OK
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(index)}
                            title="Duplicar fila"
                            className="p-1 rounded text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {parsedRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(index)}
                              title="Eliminar fila"
                              className="p-1 rounded text-neutral-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar fila
            </button>
          </div>
        )}

        {/* Step 2: Result */}
        {step === 'result' && importResult && (
          <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-success-700 dark:text-success-400 mb-1">{importResult.created}</div>
                <div className="text-success-600 dark:text-success-500/80 font-medium">Creados</div>
              </div>
              <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-primary-700 dark:text-primary-400 mb-1">{importResult.updated}</div>
                <div className="text-primary-600 dark:text-primary-500/80 font-medium">Actualizados</div>
              </div>
              {importResult.failed.length > 0 && (
                <div className="bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 p-4 rounded-xl text-center">
                  <div className="text-3xl font-black text-danger-700 dark:text-danger-400 mb-1">{importResult.failed.length}</div>
                  <div className="text-danger-600 dark:text-danger-500/80 font-medium">Fallidos</div>
                </div>
              )}
              {importResult.stock_skipped.length > 0 && (
                <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 p-4 rounded-xl text-center">
                  <div className="text-3xl font-black text-warning-700 dark:text-warning-500 mb-1">
                    {importResult.stock_skipped.length}
                  </div>
                  <div className="text-warning-600 dark:text-warning-500/80 font-medium">Stock omitido</div>
                </div>
              )}
            </div>

            {importResult.failed.length > 0 && (
              <div className="text-xs text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 p-3 rounded-lg max-h-32 overflow-y-auto space-y-1.5">
                {importResult.failed.map((f) => (
                  <div key={f.row} className="flex gap-2">
                    <span className="font-bold flex-shrink-0">Fila {f.row}:</span>
                    <span>{f.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            {importResult.stock_skipped.length > 0 && (
              <div className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 p-3 rounded-lg max-h-24 overflow-y-auto space-y-1.5">
                {importResult.stock_skipped.map((s) => (
                  <div key={s.row} className="flex gap-2">
                    <span className="font-bold flex-shrink-0">Fila {s.row}:</span>
                    <span>{s.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <div className="flex flex-col gap-3 w-full">
          {step === 'grid' && confirmPartial && (
            <div className="flex items-start gap-3 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 rounded-xl px-4 py-3 text-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
              <AlertTriangle className="h-4 w-4 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warning-800 dark:text-warning-300">
                  {invalidRows.length} {invalidRows.length === 1 ? 'producto incompleto' : 'productos incompletos'}
                </p>
                <p className="text-warning-700 dark:text-warning-400 text-xs mt-0.5">
                  ¿Querés completarlos antes, o crear solo los {validRows.length} válidos ahora?
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmPartial(false)}
                  className="border-warning-300 dark:border-warning-500/40 text-warning-700 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-500/20"
                >
                  Completar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? 'Creando...' : `Crear ${validRows.length} válidos`}
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end w-full">
            {step === 'grid' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={validRows.length === 0 || importMutation.isPending}
                >
                  {importMutation.isPending
                    ? 'Creando...'
                    : `Crear productos (${validRows.length})`}
                </Button>
              </>
            )}
            {step === 'result' && (
              <Button onClick={handleClose}>Cerrar</Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};
