/**
 * Purchase Orders Types
 *
 * These types define the structure for Purchase Orders in the system.
 * Purchase orders are used to track inventory purchases from suppliers.
 */

import { Database } from './database';

// Extract Supplier type from database
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Warehouse = Database['public']['Tables']['warehouse']['Row'];

/**
 * Purchase Order Status
 * Represents the lifecycle of a purchase order
 */
export type PurchaseOrderStatus =
  | 'draft'              // Initial state, can be edited
  | 'pending'            // Submitted for approval
  | 'approved'           // Approved, waiting to receive
  | 'partially_received' // Some items received
  | 'received'           // All items received, stock movements created
  | 'cancelled';         // Cancelled, no stock changes

/**
 * Purchase Order Detail (Line Item)
 * Represents a single product line in a purchase order
 */
export interface PurchaseOrderDetail {
  detail_id: string;
  purchase_order_id: string;
  product_type_id: string;
  organization_id: string;
  quantity: number;
  received_quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string | null;
  created_at: string;

  lot_id?: string | null;
  product_lots?: {
    lot_id: string;
    lot_number: string;
  } | null;

  // Populated relations
  product_types?: Product;
}

/**
 * Purchase Order
 * Main purchase order entity
 */
export interface PurchaseOrder {
  purchase_order_id: string;
  supplier_id: string;
  warehouse_id: string;
  organization_id: string;
  purchase_order_number: string;
  order_date: string;
  expected_delivery_date?: string | null;
  received_date?: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Populated relations
  suppliers?: Supplier;
  warehouse?: Warehouse;
  purchase_order_details?: PurchaseOrderDetail[];
}

/**
 * Create Purchase Order Request
 * Data required to create a new purchase order
 */
export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  warehouse_id: string;
  expected_delivery_date?: string;
  status?: PurchaseOrderStatus;
  items: {
    product_type_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }[];
  discount_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  notes?: string;
}

/**
 * Update Purchase Order Request
 * Data that can be updated in a purchase order
 */
export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  warehouse_id?: string;
  expected_delivery_date?: string;
  items?: {
    detail_id?: string; // If present, update existing; if not, create new
    product_type_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }[];
  discount_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  notes?: string;
}

/**
 * Update Purchase Order Status Request
 */
export interface UpdatePurchaseOrderStatusRequest {
  status: PurchaseOrderStatus;
}

/**
 * Purchase Order Filters
 * Query parameters for filtering purchase orders list
 */
export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  supplier_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search by PO number or notes
}

/**
 * Purchase Order List Item
 * Simplified purchase order for list views
 */
export interface PurchaseOrderListItem {
  purchase_order_id: string;
  purchase_order_number: string;
  supplier_name: string;
  warehouse_name: string;
  order_date: string;
  expected_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  total: number;
  items_count: number;
}

/**
 * Purchase Order Summary
 * Summary statistics for purchase orders
 */
export interface PurchaseOrderSummary {
  total_orders: number;
  total_amount: number;
  by_status: {
    [key in PurchaseOrderStatus]: {
      count: number;
      total_amount: number;
    };
  };
}

/**
 * Status Transition Validation
 * Valid status transitions for purchase orders
 */
export const VALID_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['pending', 'approved', 'cancelled'],
  pending: ['approved', 'cancelled'],
  approved: ['received', 'partially_received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: [], // Final state
  cancelled: [], // Final state
};

/**
 * Status Colors for UI
 */
export const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'blue',
  partially_received: 'orange',
  received: 'green',
  cancelled: 'red',
};

/**
 * Status Labels for UI
 */
export const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  partially_received: 'Partially Received',
  received: 'Received',
  cancelled: 'Cancelled',
};

/**
 * Helper: Check if status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: PurchaseOrderStatus,
  newStatus: PurchaseOrderStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Helper: Get available status transitions
 */
export function getAvailableStatusTransitions(
  currentStatus: PurchaseOrderStatus
): PurchaseOrderStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus];
}

/**
 * Helper: Calculate line total
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

/**
 * A single line in a reception payload
 */
export interface ReceiptLine {
  detail_id: string;
  received_quantity: number;
  /** Required only when detail has no existing lot_id */
  lot?:
    | { mode: 'new'; lot_number: string; expiration_date: string; origin_country: string; price: number }
    | { mode: 'existing'; lot_id: string };
}

/**
 * Payload for POST /api/purchase-orders/:id/receive
 */
export interface ReceivePurchaseOrderPayload {
  id: string;
  lines: ReceiptLine[];
}

/**
 * Helper: Calculate purchase order total
 */
export function calculatePurchaseOrderTotal(
  items: { quantity: number; unit_price: number }[],
  discountAmount: number = 0,
  taxAmount: number = 0,
  shippingAmount: number = 0
): { subtotal: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unit_price),
    0
  );

  const total = subtotal - discountAmount + taxAmount + shippingAmount;

  return { subtotal, total };
}
