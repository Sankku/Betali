import React, { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../ui/modal';
import { Button } from '../../ui/button';
import { useProductImport } from '../../../hooks/useProducts';
import { useWarehouses } from '../../../hooks/useWarehouse';
import type { ProductImportRow, BulkImportResult } from '../../../services/api/productsService';

const REQUIRED_HEADERS = ['name', 'batch_number', 'origin_country', 'expiration_date', 'price'];
const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];
const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];
const MAX_ROWS = 500;
const MAX_FILE_SIZE_MB = 5;

interface ParsedRow {
  rowNum: number;
  data: ProductImportRow;
  errors: string[];
  warnings: string[];
}

export interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function validateRow(
  row: Record<string, string>,
  rowNum: number,
  warehouseNames: string[]
): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of REQUIRED_HEADERS) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`${field} es requerido`);
    }
  }

  if (row.expiration_date) {
    const d = new Date(row.expiration_date);
    if (isNaN(d.getTime())) {
      errors.push('expiration_date debe ser YYYY-MM-DD');
    } else if (d < new Date()) {
      warnings.push('Fecha de vencimiento en el pasado');
    }
  }

  if (row.price) {
    const p = parseFloat(row.price);
    if (isNaN(p) || p <= 0) {
      errors.push('price debe ser un número positivo');
    } else if (p > 999999.99) {
      errors.push('price no puede superar 999999.99');
    }
  }

  if (row.initial_stock) {
    const s = parseInt(row.initial_stock, 10);
    if (isNaN(s) || s < 0) {
      errors.push('initial_stock debe ser un entero ≥ 0');
    }
  }

  if (row.unit && !VALID_UNITS.includes(row.unit)) {
    errors.push(`unit debe ser uno de: ${VALID_UNITS.join(', ')}`);
  }

  if (row.product_type && !VALID_PRODUCT_TYPES.includes(row.product_type)) {
    errors.push(`product_type debe ser uno de: ${VALID_PRODUCT_TYPES.join(', ')}`);
  }

  const initialStock = row.initial_stock ? parseInt(row.initial_stock, 10) : 0;
  if (initialStock > 0) {
    const wName = row.warehouse_name?.trim().toLowerCase();
    if (wName) {
      if (!warehouseNames.includes(wName)) {
        warnings.push(`Depósito '${row.warehouse_name}' no encontrado — se omitirá el stock`);
      }
    } else if (warehouseNames.length === 0) {
      warnings.push('Sin depósito por defecto — se omitirá el stock');
    }
  }

  return { rowNum, data: row as unknown as ProductImportRow, errors, warnings };
}

function downloadTemplate() {
  const headers = [
    'name', 'batch_number', 'origin_country', 'expiration_date',
    'price', 'description', 'unit', 'product_type', 'initial_stock', 'warehouse_name'
  ];
  const example = [
    'Harina 000', 'LOT-2024-001', 'Argentina', '2027-12-31',
    '1500.00', 'Harina de trigo 000', 'kg', 'standard', '100', 'Depósito Principal'
  ];
  const csv = [headers.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_productos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type Step = 'upload' | 'preview' | 'result';

export const ProductImportModal: React.FC<ProductImportModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: warehousesData } = useWarehouses();
  const warehouseNames = (warehousesData?.data ?? []).map((w: any) =>
    String(w.name).toLowerCase().trim()
  );

  const importMutation = useProductImport();

  const handleClose = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }, [onClose]);

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (!file) return;
      setParseError(null);

      if (!file.name.endsWith('.csv')) {
        setParseError('Solo se aceptan archivos .csv');
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setParseError(`El archivo no puede superar ${MAX_FILE_SIZE_MB} MB`);
        return;
      }

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            setParseError('El archivo está vacío');
            return;
          }
          if (results.data.length > MAX_ROWS) {
            setParseError(`El archivo tiene más de ${MAX_ROWS} filas`);
            return;
          }

          const headers = Object.keys(results.data[0]);
          const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
          if (missing.length > 0) {
            setParseError(`Faltan columnas requeridas: ${missing.join(', ')}`);
            return;
          }

          const rows = results.data.map((row, i) =>
            validateRow(row, i + 1, warehouseNames)
          );
          setParsedRows(rows);
          setStep('preview');
        },
        error: (err) => {
          setParseError(`Error al parsear el CSV: ${err.message}`);
        },
      });
    },
    [warehouseNames]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files[0] ?? null);
    },
    [handleFileChange]
  );

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
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
          <FileText className="h-5 w-5" />
          <span>Importar productos desde CSV</span>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Arrastrá tu archivo CSV aquí o{' '}
                <span className="text-blue-600 underline">seleccioná uno</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Solo .csv · Máx {MAX_FILE_SIZE_MB} MB · Máx {MAX_ROWS} filas
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla CSV
            </Button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm flex-wrap">
              <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded">
                <CheckCircle className="h-4 w-4" /> {validRows.length} válidas
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded">
                  <XCircle className="h-4 w-4" /> {invalidRows.length} con errores
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-gray-500">#</th>
                    <th className="px-2 py-1 text-left text-gray-500">Lote</th>
                    <th className="px-2 py-1 text-left text-gray-500">Nombre</th>
                    <th className="px-2 py-1 text-left text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNum}
                      className={row.errors.length > 0 ? 'bg-red-50' : ''}
                    >
                      <td className="px-2 py-1 text-gray-400">{row.rowNum}</td>
                      <td className="px-2 py-1">{row.data.batch_number || '—'}</td>
                      <td className="px-2 py-1">{row.data.name || '—'}</td>
                      <td className="px-2 py-1">
                        {row.errors.length > 0 ? (
                          <span className="text-red-600 flex items-start gap-1">
                            <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {row.errors.join(' · ')}
                          </span>
                        ) : row.warnings.length > 0 ? (
                          <span className="text-amber-600 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {row.warnings.join(' · ')}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                <div className="text-green-600">Creados</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                <div className="text-blue-600">Actualizados</div>
              </div>
              {importResult.failed.length > 0 && (
                <div className="bg-red-50 p-3 rounded text-center">
                  <div className="text-2xl font-bold text-red-700">{importResult.failed.length}</div>
                  <div className="text-red-600">Fallidos</div>
                </div>
              )}
              {importResult.stock_skipped.length > 0 && (
                <div className="bg-amber-50 p-3 rounded text-center">
                  <div className="text-2xl font-bold text-amber-700">
                    {importResult.stock_skipped.length}
                  </div>
                  <div className="text-amber-600">Stock omitido</div>
                </div>
              )}
            </div>

            {importResult.failed.length > 0 && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                {importResult.failed.map((f) => (
                  <div key={f.row}>
                    Fila {f.row} ({f.batch_number}): {f.errors.join(', ')}
                  </div>
                ))}
              </div>
            )}

            {importResult.stock_skipped.length > 0 && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded max-h-24 overflow-y-auto">
                {importResult.stock_skipped.map((s) => (
                  <div key={s.row}>
                    Fila {s.row} ({s.batch_number}): {s.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
        )}
        {step === 'preview' && (
          <>
            <Button variant="outline" onClick={() => setStep('upload')}>
              Volver
            </Button>
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending
                ? 'Importando...'
                : `Importar filas válidas (${validRows.length})`}
            </Button>
          </>
        )}
        {step === 'result' && (
          <Button onClick={handleClose}>Cerrar</Button>
        )}
      </ModalFooter>
    </Modal>
  );
};
