# PRD: Shipping on Sales Orders

## Summary
Add optional shipping support to sales orders with address auto-fill from client data and shipping cost included in order total.

## Feature Toggle
A boolean field `has_shipping` (toggle/checkbox labeled "Con Envío") on the order form. When OFF, no shipping fields are shown. When ON, a shipping section appears below the existing fields.

## Fields Added to Orders Table
| Column | Type | Notes |
|--------|------|-------|
| `has_shipping` | `BOOLEAN DEFAULT false` | Controls visibility in UI |
| `shipping_address` | `TEXT` | Free text; auto-filled from client when available |
| `shipping_cost` | `NUMERIC(10,2) DEFAULT 0` | Added to order total |

`shipping_notes` intentionally excluded — existing order `notes` field covers this.

## UX Behavior
- Toggle starts OFF (no shipping by default)
- When toggled ON:
  - Show `shipping_address` (textarea, editable)
  - Show `shipping_cost` (number input)
- When a client is selected AND `has_shipping` is ON:
  - Auto-propose `client.address` into `shipping_address`
  - If user already typed a custom address, do NOT overwrite
- When client is changed: re-propose the new client's address only if `shipping_address` is still empty or matches the previous client's address
- `shipping_cost` is added to the order total: `total = subtotal + tax_amount + shipping_cost`

## Scope

### DB Migration (013)
```sql
ALTER TABLE orders
  ADD COLUMN has_shipping BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN shipping_address TEXT,
  ADD COLUMN shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0;
```

### Backend
- `orderValidation.js` — add 3 fields to `createOrderSchema` and `updateOrderSchema`
- `OrderService.js` — include `shipping_cost` when calculating order totals on create/update

### Frontend
- `orderService.ts` — add fields to `Order`, `CreateOrderData`, `UpdateOrderData` types
- `order-form.tsx` — add shipping section with toggle + conditional fields + client auto-fill logic
- `order-modal.tsx` — pass `shipping_cost` when building `orderData` for submit

## Out of Scope
- Multiple shipping addresses per order
- Carrier / tracking number (future)
- Shipping tax (future)
