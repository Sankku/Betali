/**
 * Centralized API error translator.
 *
 * Maps backend English error messages (from Express services via httpClient)
 * to user-friendly Spanish messages.
 *
 * Usage:
 *   import { translateApiError } from '@/utils/apiErrorTranslator';
 *   toast.error(translateApiError(error, 'Error al crear el producto.'));
 *
 * How it works:
 *   - httpClient reads errorData.message || errorData.error and sets it as error.message
 *   - error.response?.data is always undefined (fetch, not Axios) — don't use it
 *   - error.status is set by httpClient from the HTTP response status
 */

type ApiError = Error & { status?: number };

interface ErrorRule {
  match: string | RegExp;
  message: string;
  /** When true, the original backend message is forwarded instead of `message`. */
  passThrough?: boolean;
}

const ERROR_RULES: ErrorRule[] = [
  // ── Productos ──────────────────────────────────────────────────────────────
  {
    match: 'batch number already exists',
    message: 'Ya existe un producto con ese SKU/Número de Lote en tu organización.',
  },
  {
    match: 'Invalid expiration date format',
    message: 'El formato de fecha de vencimiento es inválido.',
  },
  {
    match: 'Expiration date cannot be in the past',
    message: 'La fecha de vencimiento no puede ser en el pasado.',
  },
  {
    match: 'Price cannot exceed',
    message: 'El precio ingresado supera el máximo permitido.',
  },

  // ── Depósitos ──────────────────────────────────────────────────────────────
  {
    match: 'warehouse with that name already exists',
    message: 'Ya existe un depósito activo con ese nombre en tu organización.',
  },
  {
    match: /Cannot deactivate.*warehouse/i,
    message: 'No se puede desactivar este depósito porque tiene movimientos de stock asociados. Reasigná o archivá los movimientos primero.',
  },
  {
    match: /Cannot delete.*warehouse/i,
    message: 'No se puede eliminar este depósito porque tiene movimientos asociados.',
  },
  {
    match: 'Warehouse name cannot be empty',
    message: 'El nombre del depósito no puede estar vacío.',
  },
  {
    match: 'Warehouse location cannot be empty',
    message: 'La ubicación del depósito no puede estar vacía.',
  },

  // ── Usuarios ───────────────────────────────────────────────────────────────
  {
    match: 'user with this email already exists',
    message: 'Ya existe un usuario registrado con ese email.',
  },
  {
    match: 'Super admin users cannot belong to an organization',
    message: 'Los usuarios super administrador no pueden pertenecer a una organización.',
  },
  {
    match: 'Cannot remove organization owner',
    message: 'No se puede eliminar al propietario de la organización.',
  },

  // ── Clientes ───────────────────────────────────────────────────────────────
  {
    match: 'client with this CUIT already exists',
    message: 'Ya existe un cliente con ese CUIT en tu organización.',
  },

  // ── Proveedores ────────────────────────────────────────────────────────────
  {
    match: 'supplier with this CUIT already exists',
    message: 'Ya existe un proveedor con ese CUIT en tu organización.',
  },
  {
    match: 'supplier with this email already exists',
    message: 'Ya existe un proveedor con ese email en tu organización.',
  },
  {
    match: 'Credit limit cannot be negative',
    message: 'El límite de crédito no puede ser negativo.',
  },

  // ── Tasas de impuesto ──────────────────────────────────────────────────────
  {
    match: 'Tax rate name must be unique',
    message: 'Ya existe una tasa de impuesto con ese nombre en tu organización.',
  },

  // ── Reglas de descuento ────────────────────────────────────────────────────
  {
    match: 'Coupon code must be unique',
    message: 'Ya existe un cupón con ese código en tu organización.',
  },

  // ── Movimientos de stock ───────────────────────────────────────────────────
  {
    match: 'Stock insuficiente',
    message: 'Stock insuficiente en el depósito seleccionado. Verificá el stock disponible antes de registrar la salida.',
  },
  {
    match: 'excedería el stock máximo',
    message: '',
    passThrough: true,
  },

  // ── Órdenes de venta (artículos) ──────────────────────────────────────────
  {
    match: 'Price must be positive',
    message: 'El precio del artículo debe ser mayor a 0.',
  },
  {
    match: 'Price must be a number',
    message: 'El precio del artículo debe ser un número válido.',
  },
  {
    match: 'Price can have maximum 2 decimal places',
    message: 'El precio puede tener máximo 2 decimales.',
  },
  {
    match: 'Quantity must be a number',
    message: 'La cantidad debe ser un número válido.',
  },
  {
    match: 'Quantity must be an integer',
    message: 'La cantidad debe ser un número entero.',
  },
  {
    match: 'Quantity must be at least 1',
    message: 'La cantidad debe ser al menos 1.',
  },
  {
    match: 'Quantity cannot exceed',
    message: 'La cantidad supera el máximo permitido.',
  },
  {
    match: 'Quantity is required',
    message: 'La cantidad es requerida.',
  },
  {
    match: 'Product type ID is required',
    message: 'El producto es requerido en todos los artículos.',
  },
  {
    match: 'Warehouse is required',
    message: 'El depósito es requerido.',
  },
  {
    match: 'Order must have at least 1 item',
    message: 'El pedido debe tener al menos 1 artículo.',
  },
  {
    match: 'Items are required',
    message: 'Los artículos del pedido son requeridos.',
  },
  {
    match: 'Total price must be positive',
    message: 'El precio total debe ser mayor a 0.',
  },
  {
    match: 'Order total must be positive',
    message: 'El total del pedido debe ser mayor a 0.',
  },
  {
    match: 'Order date cannot be in the future',
    message: 'La fecha del pedido no puede ser futura.',
  },
  {
    match: 'Status must be one of',
    message: 'El estado seleccionado no es válido.',
  },

  // ── Órdenes de compra ─────────────────────────────────────────────────────
  {
    match: 'Unit price must be positive',
    message: 'El precio unitario debe ser mayor a 0.',
  },
  {
    match: 'Unit price must be a number',
    message: 'El precio unitario debe ser un número válido.',
  },
  {
    match: 'Supplier is required',
    message: 'El proveedor es requerido.',
  },
  {
    match: 'Purchase order must have at least 1 item',
    message: 'La orden de compra debe tener al menos 1 artículo.',
  },
  {
    match: 'Cannot modify a completed purchase order',
    message: 'No se puede modificar una orden de compra completada.',
  },
  {
    match: 'Cannot modify a cancelled purchase order',
    message: 'No se puede modificar una orden de compra cancelada.',
  },

  // ── Genéricos (van al final como última opción) ────────────────────────────
  {
    match: 'not found',
    message: 'El registro no fue encontrado.',
  },
  {
    match: 'Access denied',
    message: 'No tenés permisos para realizar esta acción.',
  },
  {
    match: 'session expired',
    message: 'Tu sesión expiró. Por favor, volvé a iniciar sesión.',
  },
];

/**
 * Translates a backend API error to a user-friendly Spanish string.
 *
 * @param error   - The error thrown by httpClient / TanStack mutation
 * @param fallback - Fully Spanish fallback message for this specific action
 *                   (e.g. 'Error al crear el proveedor. Intenta de nuevo.')
 */
export function translateApiError(error: unknown, fallback: string): string {
  const err = error as ApiError;
  const message = err?.message ?? '';

  for (const rule of ERROR_RULES) {
    const matched =
      typeof rule.match === 'string'
        ? message.toLowerCase().includes(rule.match.toLowerCase())
        : rule.match.test(message);

    if (matched) {
      return rule.passThrough ? message : rule.message;
    }
  }

  return fallback;
}
