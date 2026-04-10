---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
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
4. Update the PO status correctly (`partially_received` vs `received`).

None of this is currently handled.

---

## Decision: Lot assignment at first reception

Lots are created (or assigned) at the moment of first physical reception — whether that reception is partial or total. On subsequent partial receptions the frontend displays the lot already linked to each detail line (stored in `purchase_order_details.lot_id`, added by this feature), so the user can assign additional stock to the same lot without re-entering lot data.

This mirrors real warehouse practice: the lot number comes from the supplier's delivery note, which arrives with the first shipment.

---

## UX Approach

**Single modal with inline lot assignment per line (Odoo-style)**

When the user clicks "Receive" on an `approved` or `partially_received` PO, a `ReceivePurchaseOrderModal` opens showing all incomplete line items (those with `received_quantity < quantity`). For each line the user:

1. Sets the quantity received (defaults to remaining = `quantity − received_quantity`; max = remaining).
2. If the line already has a `lot_id` (from a prior partial reception), that lot is shown as pre-selected (read-only). No toggle is shown.
3. If no lot is yet assigned, the user chooses lot mode:
   - **New lot** → fills: lot number, expiration date, origin country, price (pre-filled from PO `unit_price`; overriding it does **not** update the PO detail — the PO line price is the agreed price; the lot price is the actual batch cost).
   - **Existing lot** → selects from a dropdown scoped to `product_type_id` + `organization_id`, filtered to non-expired lots.

Lines with quantity set to 0 are disabled in the lot section and excluded from the payload.

**Batch receive removed:** Receiving requires lot assignment, which is per-PO. The bulk "Receive" action processes only one PO at a time and opens this modal. If multiple POs are selected, only the first is opened and a toast notifies the user.

---

## Data Flow

```
User clicks "Receive" (bulk action, 1 PO)
  → ReceivePurchaseOrderModal opens with PO data (includes detail.lot_id if previously set)
  → User fills quantities + lot assignment per line (skips lines with quantity = 0)
  → Confirm → POST /api/purchase-orders/:id/receive

Backend (sequential writes; atomicity via service-layer rollback on any error):
  warehouse_id comes from PO header (purchaseOrder.warehouse_id) — not from request body.

  For each line where received_quantity > 0:
    1. If lot.mode === 'new':
         Validate lot_number unique within (product_type_id, organization_id) → 409 if duplicate
         INSERT product_lots → get lot_id
       If lot.mode === 'existing':
         SELECT product_lots WHERE lot_id = ? AND organization_id = ? → 404 if not found
    2. INSERT stock_movements (type='entry', lot_id, warehouse_id=PO.warehouse_id, quantity)
    3. UPDATE purchase_order_details SET received_quantity += received_quantity, lot_id = lot_id

  Derive new PO status:
    - All lines fully received (received_quantity = quantity) → 'received', received_date = now()
    - Any line still pending → 'partially_received'
  UPDATE purchase_orders SET status, received_date

Frontend onSuccess:
  Invalidate: ['purchase-orders'], ['product-lots'], ['warehouse-stats']
```

**Note on atomicity:** Supabase's REST API does not support multi-statement transactions natively. The service layer executes writes sequentially and, on any error, attempts compensating deletes for rows already inserted in the same call (best-effort rollback). A future improvement can wrap this in a Supabase RPC stored procedure for full ACID guarantees.

---

## Database — `purchase_order_details` schema addition

Add column: `lot_id UUID NULLABLE REFERENCES product_lots(lot_id)`. This stores the lot assigned to the line on first reception, enabling the "pre-selected lot" UX on subsequent partial receptions.

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
      detail_id: string,           // required
      received_quantity: number,   // required, must be > 0 (zero-quantity lines excluded)
      lot: {
        mode: 'new' | 'existing', // required only if detail has no existing lot_id
        // if mode === 'new':
        lot_number: string,
        expiration_date: string,   // ISO date
        origin_country: string,
        price: number,
        // if mode === 'existing':
        lot_id: string
      }
    }
  ]
}
// warehouse_id is taken from the PO header, not the request body.

Response: updated PurchaseOrder with details (including lot_id per detail)
```

### `PurchaseOrderService.receivePurchaseOrder(id, lines, organizationId)`

**Pre-write validations (all must pass before any write):**
- PO exists and is in `approved` or `partially_received`.
- Payload contains no duplicate `detail_id` values → 400 if any duplicate found.
- Each `detail_id` belongs to the PO → 400 if not.
- `received_quantity > 0` for every submitted line → 400 if any are zero (zero-qty lines must be excluded client-side).
- `received_quantity ≤ (quantity − current received_quantity)` per line → 400 if exceeded. This validation applies to **all** submitted lines, including those with an existing `detail.lot_id`.
- For `mode: 'new'`: lot_number must be unique within `organization_id` (the DB enforces `UNIQUE(lot_number, organization_id)` org-wide, not per product_type) → 409.
- For `mode: 'existing'`: lot must exist with matching `lot_id`, `product_type_id` (same as detail line), and `organization_id` → 404 if not found or mismatch. Fields other than `lot_id` in the payload are ignored; existing lot data is never mutated during reception.

**Write sequence and compensating rollback:**

Writes execute in this order per line:
1. `INSERT product_lots` (mode=new only) → track `inserted_lot_ids[]`
2. `INSERT stock_movements` → track `inserted_movement_ids[]`
3. `UPDATE purchase_order_details SET received_quantity, lot_id`

Then:
4. `UPDATE purchase_orders SET status, received_date`

On any error in steps 1–4: execute compensating deletes in **reverse order**:
- Delete inserted `stock_movements` by id
- Delete inserted `product_lots` by id

If a compensating delete itself fails, the error is logged with full context (inserted IDs, failed step) and a 500 is returned. The orphaned rows must be cleaned up manually; the UI receives a generic "Reception failed, please retry" message.

**Status derivation:**

After all line updates are applied, fetch the **full set** of detail lines for the PO (not just the submitted lines). Status becomes:
- `'received'` + `received_date = now()` if **every** detail line has `received_quantity = quantity`
- `'partially_received'` otherwise

### Deprecation

`handlePurchaseOrderReceived` is no longer called from `updatePurchaseOrderStatus`. Status `received` is only reachable via `receivePurchaseOrder`. The old method is kept but unused until a cleanup pass.

---

## Frontend

### New components

**`ReceivePurchaseOrderModal.tsx`** (`components/features/purchase-orders/`)
- Props: `isOpen`, `onClose`, `purchaseOrder: PurchaseOrder`
- Renders a `ReceiptLineRow` for each line with `received_quantity < quantity`
- Validates: at least one line has `received_quantity > 0` before enabling submit
- Calls `useReceivePurchaseOrder` mutation on confirm
- Loading + disabled state on submit button while pending

**`ReceiptLineRow.tsx`** (internal to the modal)
- Numeric input: quantity to receive (max = remaining; setting to 0 disables lot section)
- If `detail.lot_id` is already set: shows lot name/number as read-only text (no toggle)
- If no lot yet: radio toggle "Lote nuevo" / "Lote existente"
  - New lot: `lot_number`, `expiration_date`, `origin_country`, `price` (default = `detail.unit_price`)
  - Existing lot: `Select` populated by `useProductLots(typeId)`, scoped to `organization_id`

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
- If `purchaseOrders.length > 1`: toast "Solo se puede recibir una OC a la vez"

---

## Types

```ts
// New types in purchaseOrders.ts
export interface ReceiptLine {
  detail_id: string;
  received_quantity: number;
  // lot is required only when detail has no existing lot_id
  lot?:
    | { mode: 'new'; lot_number: string; expiration_date: string; origin_country: string; price: number }
    | { mode: 'existing'; lot_id: string };
}

export interface ReceivePurchaseOrderPayload {
  id: string;
  lines: ReceiptLine[];
}

// PurchaseOrderDetail updated:
export interface PurchaseOrderDetail {
  detail_id: string;
  purchase_order_id: string;
  product_type_id: string;
  organization_id: string;
  quantity: number;
  received_quantity: number;
  unit_price: number;
  line_total: number;
  lot_id?: string | null;        // ← new
  notes?: string | null;
  created_at: string;
  product_types?: ProductType;
  product_lot?: ProductLot;      // ← new populated relation
}
```

---

## Error Handling

| Error | Mode | Backend | Frontend |
|---|---|---|---|
| PO not in valid status | any | 409 | Modal shows error banner |
| Duplicate `detail_id` in payload | any | 400 | Should not happen (client builds payload from unique lines) |
| `received_quantity` > remaining | any | 400 | Frontend pre-validates, disables submit |
| `received_quantity` = 0 submitted | any | 400 | Frontend excludes zero-qty lines from payload |
| Lot number already exists | `new` | 409 | Highlight `lot_number` input with error message |
| Existing lot not found, wrong org, or wrong `product_type_id` | `existing` | 404 | Show error under select |
| Mid-transaction failure (compensation succeeds) | any | 500 | Modal shows "Reception failed, please retry", stays open |
| Mid-transaction failure (compensation also fails) | any | 500 + logged orphan IDs | Same UI message; manual cleanup required |

---

## Implementation Notes — Pre-existing Bugs to Fix During This Work

These are bugs discovered in existing code that must be fixed as part of this implementation to avoid silently broken behavior:

1. **`ProductTypeService.deleteType` lot count always zero:** The Supabase query uses `{ count: 'exact', head: true }` but then reads `lots?.length ?? 0`. With `head: true`, Supabase returns `data: null` — the count is in the response's `count` property. Fix: destructure `{ count: lotCount }` instead of `{ data: lots }`.

2. **Shared Express router instance at two mount paths:** `productLotRoutes` must not be mounted as the same router instance at both `/api/product-types/:typeId/lots` and `/api/product-lots`. Use two separate `express.Router()` instances (or two separate route files) to avoid broken `req.params` resolution.

---

## Out of Scope (future)

- Full ACID transaction via Supabase RPC stored procedure
- Barcode scanning for lot number input
- Auto-generation of lot numbers
- Receiving multiple POs in one operation
- Per-line warehouse override (all lines share the PO's warehouse)
