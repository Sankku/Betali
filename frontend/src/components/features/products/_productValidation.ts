import type { BulkImportRow } from '../../../services/api/productTypesService';

export const REQUIRED_HEADERS = ['sku', 'name', 'product_type', 'unit', 'origin_country', 'expiration_date', 'price'];
export const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];
export const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];
export const MAX_ROWS = 1000;
export const MAX_FILE_SIZE_MB = 5;

export interface ParsedRow {
  rowNum: number;
  data: BulkImportRow;
  errors: string[];
  warnings: string[];
}

const fieldNamesToSpanish: Record<string, string> = {
  sku: 'SKU',
  name: 'nombre',
  lot_number: 'nro de lote',
  origin_country: 'país de origen',
  expiration_date: 'vencimiento',
  price: 'precio',
  description: 'descripción',
  unit: 'unidad de medida',
  product_type: 'tipo',
  initial_stock: 'stock inicial',
  warehouse_name: 'depósito',
};

export function translateField(field: string): string {
  return fieldNamesToSpanish[field] || field;
}

export function validateRow(
  row: Record<string, string>,
  rowNum: number,
  warehouseNames: string[]
): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of REQUIRED_HEADERS) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`El ${translateField(field)} es requerido`);
    }
  }

  if (row.expiration_date) {
    const d = new Date(row.expiration_date);
    if (isNaN(d.getTime())) {
      errors.push(`El ${translateField('expiration_date')} debe ser YYYY-MM-DD`);
    } else if (d < new Date()) {
      warnings.push('Fecha de vencimiento en el pasado');
    }
  }

  if (row.price) {
    const p = parseFloat(row.price);
    if (isNaN(p) || p < 0) {
      errors.push(`El ${translateField('price')} debe ser un número igual o mayor a 0`);
    } else if (p > 999999.99) {
      errors.push(`El ${translateField('price')} no puede superar 999999.99`);
    }
  }

  if (row.initial_stock) {
    const s = parseInt(row.initial_stock, 10);
    if (isNaN(s) || s < 0) {
      errors.push(`El ${translateField('initial_stock')} debe ser un entero ≥ 0`);
    }
  }

  if (row.unit && !VALID_UNITS.includes(row.unit)) {
    errors.push(`La ${translateField('unit')} debe ser: ${VALID_UNITS.join(', ')}`);
  }

  if (!row.product_type || String(row.product_type).trim() === '') {
    errors.push(`El ${translateField('product_type')} es requerido (standard, raw_material, finished_good)`);
  } else if (!VALID_PRODUCT_TYPES.includes(row.product_type)) {
    errors.push(`El ${translateField('product_type')} debe ser: standard, raw_material o finished_good`);
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

  return { rowNum, data: row as unknown as BulkImportRow, errors, warnings };
}

export function emptyRow(rowNum: number, warehouseNames: string[]): ParsedRow {
  return validateRow(
    { unit: 'unidad', product_type: 'standard' } as Record<string, string>,
    rowNum,
    warehouseNames
  );
}
