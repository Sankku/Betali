# PO Lot Reception Design

**Date:** 2026-03-28
**Branch:** feature/product-types-lots
**Status:** Approved

## Context

Betali's product-types-lots migration splits the old `products` table into:
- `product_types` — catalog / SKU definitions
- `product_lots` — physical batch instances with lot number, expiration date, price, origin

Before this design, receiving a purchase order called `handlePurchaseOrderReceived`, which created stock movements using `product_id` (the old column). This is incompatible with the new schema, which requires a `lot_id` on every stock movement entry.

This spec defines the new lot-aware reception flow.

---

## Problem

When a PO is marked as received, the system must:
1. Know which physical batch (lot) the received goods belong to.
2. Create that lot if it doesn't exist yet, or reuse an existing one.
3. Record a stock movement entry tied to that lot.
4. Update the PO status correctly (partially_received vs received).

None of this is currently handled.

---

## Decision: Lot assignment at first reception

Lots are created (or assigned) at the moment of first physical reception — whether that reception is partial or total. Subsequent partial receptions reuse the same lot created on the first event.

This mirrors real warehouse practice: the lot number comes from the supplier's delivery note, which arrives with the first shipment.

---

## UX Approach

**Single modal with inline lot assignment per line (Odoo-style)**

When the user clicks "Receive" on an approved or partially-received PO, a `ReceivePurchaseOrderModal` opens showing all line items. For each line, the user:

1. Sets the quantity received (defaults to remaining = `quantity − received_quantity`).
2. Chooses lot mode via radio toggle:
   - **New lot** → fills: lot number, expiration date, origin country, price (pre-filled from PO unit price).
   - **Existing lot** → selects from a dropdown filtered to that `product_type_id`.

The user confirms once for the entire reception. The modal handles both partial and full receptions.

Lines with 0 quantity received are skipped silently.

**Batch receive removed:** Receiving requires lot assignment, which is per-PO. The bulk "Receive" action processes only one PO at a time and opens this modal instead of the previous confirmation dialog. If multiple POs are selected, only the first is processed and a notice is shown.

---

## Data Flow

```
User clicks "Receive" (bulk action, 1 PO)
  → ReceivePurchaseOrderModal opens with PO data
  → User fills quantities + lot assignment per line
  → Confirm → POST /api/purchase-orders/:id/receive

Backend (atomic):
  For each line with received_quantity > 0:
    1. If lot.mode === 'new'  → INSERT product_lots → get lot_id
       If lot.mode === 'existing' → use provided lot_id
    2. INSERT stock_movements (type='entry', lot_id, warehouse_id, quantity)
    3. UPDATE purchase_order_details SET received_quantity += received_quantity
  Derive new PO status:
    - All lines fully received → 'received', set received_date = now()
    - Any line still pending  → 'partially_received'
  UPDATE purchase_orders SET status, received_date

Frontend onSuccess:
  Invalidate: ['purchase-orders'], ['product-lots'], ['warehouse-stats']
```

---

## Backend

### New endpoint

```
POST /api/purchase-orders/:id/receive
Auth: authenticateUser + requireOrganizationContext + requirePermission('purchase_orders:receive')

Body:
{
  lines: [
    {
      detail_id: string,            // required
      received_quantity: number,    // required, > 0
      lot: {
        mode: 'new' | 'existing',  // required
        // if mode === 'new':
        lot_number: string,
        expiration_date: string,    // ISO date
        origin_country: string,
        price: number,
        // if mode === 'existing':
        lot_id: string
      }
    }
  ]
}

Response: updated PurchaseOrder with details
```

### `PurchaseOrderService.receivePurchaseOrder(id, lines, organizationId)`

- Validates PO exists and is in `approved` or `partially_received`.
- Validates each line's `detail_id` belongs to the PO.
- Validates `received_quantity` doesn't exceed remaining (`quantity − received_quantity`).
- For each line: creates lot if needed → creates stock movement → updates detail.
- Derives and sets new status.
- Returns updated PO.

### Deprecation

`handlePurchaseOrderReceived` is no longer called from `updatePurchaseOrderStatus`. The status `received` can only be set via `receivePurchaseOrder`. The old method is kept but unused until cleanup.

---

## Frontend

### New components

**`ReceivePurchaseOrderModal.tsx`** (`components/features/purchase-orders/`)
- Props: `isOpen`, `onClose`, `purchaseOrder: PurchaseOrder`
- Renders a `ReceiptLineRow` for each line with `received_quantity < quantity`
- Validates: at least one line has `received_quantity > 0`
- Calls `useReceivePurchaseOrder` mutation on confirm
- Loading state on submit button

**`ReceiptLineRow.tsx`** (internal to the modal)
- Input: quantity to receive (max = remaining)
- Radio toggle: "Lote nuevo" / "Lote existente"
- New lot fields: `lot_number`, `expiration_date`, `origin_country`, `price` (default = line `unit_price`)
- Existing lot: `Select` populated by `useProductLots(typeId)`, filtered to non-fully-expired lots

### Modified

**`hooks/usePurchaseOrders.ts` — `useReceivePurchaseOrder`**
```ts
// Before:
mutationFn: (id: string) => purchaseOrdersService.receive(id)

// After:
mutationFn: ({ id, lines }: ReceivePurchaseOrderPayload) =>
  purchaseOrdersService.receive(id, lines)

onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
  queryClient.invalidateQueries({ queryKey: ['product-lots'] })
  queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] })
}
```

**`purchaseOrdersService.ts`**
- `receive(id, lines)` → `POST /api/purchase-orders/${id}/receive` with body `{ lines }`

**`PurchaseOrdersPage.tsx`**
- Bulk action `receive` onClick: opens `ReceivePurchaseOrderModal` with `purchaseOrders[0]`
- If `purchaseOrders.length > 1`: show toast "Solo se puede recibir una OC a la vez"

---

## Types

```ts
// New type in purchaseOrders.ts
export interface ReceiptLine {
  detail_id: string;
  received_quantity: number;
  lot:
    | { mode: 'new'; lot_number: string; expiration_date: string; origin_country: string; price: number }
    | { mode: 'existing'; lot_id: string };
}

export interface ReceivePurchaseOrderPayload {
  id: string;
  lines: ReceiptLine[];
}
```

---

## Error Handling

| Error | Handling |
|---|---|
| PO not in valid status | Backend 409, modal shows error message |
| `received_quantity` > remaining | Backend 400, frontend validates beforehand |
| Lot number already exists (new lot) | Backend 409 with field-level error, highlight input |
| Existing lot not found | Backend 404, show error in select |
| Partial failure mid-transaction | Backend rolls back all, returns 500, modal shows generic error |

---

## Out of Scope (future)

- Lot-level partial reception across multiple deliveries (current: one lot per reception event per line)
- Barcode scanning for lot number input
- Auto-generation of lot numbers
- Receiving multiple POs in one operation
