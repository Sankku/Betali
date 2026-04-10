---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# CSV Product Import — Design Spec
**Date:** 2026-03-26
**Status:** Approved

## Overview

A system for bulk-loading products via CSV files, supporting upsert (create + update) and optional initial stock. The import flow includes a client-side preview step with error highlighting before committing to the database.

---

## CSV Template Structure

| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string (1–255) | ✅ | — | Product name |
| `batch_number` | string (1–100) | ✅ | — | Lot number — **upsert key** |
| `origin_country` | string (1–100) | ✅ | — | Country of origin |
| `expiration_date` | date (YYYY-MM-DD) | ✅ | — | Expiration date (past dates are a warning, not an error) |
| `price` | number > 0 | ✅ | — | Price (e.g. 1500.50, max 999999.99) |
| `description` | string (max 1000) | — | `""` | Optional description |
| `unit` | enum | — | `"unidad"` | kg, g, mg, l, ml, unidad, docena |
| `product_type` | enum | — | `"standard"` | standard, raw_material, finished_good |
| `initial_stock` | integer ≥ 0 | — | `0` | Initial stock quantity (0 = no stock movement created) |
| `warehouse_name` | string | — | org default | Warehouse name (case-insensitive, trimmed); falls back to org default if blank |

**Upsert key:** `batch_number` scoped to `organizationId`. If it exists → update; otherwise → create.

**Stock rule:** if `initial_stock > 0`, create a `stock_movement` of type `receive` in the resolved warehouse. If no warehouse matches and no default exists, skip stock creation silently (row is still imported, noted in response).

**Limits:** max 500 rows per import, max 5 MB file size.

---

## Backend

### New endpoint

```
POST /api/products/bulk-import
Middleware: authenticateUser, requireOrganizationContext,
            requirePermission(PRODUCTS_CREATE), requirePermission(PRODUCTS_UPDATE),
            bulkImportLimiter (new: max 5 requests / 15 min per user)
Body: { products: ProductImportRow[] }
```

- `checkOrganizationLimit('products')` is enforced **inside the service** before processing, comparing current product count + incoming rows to the plan limit. If the import would exceed the limit, the entire request fails with a clear error message before any rows are written. **Concurrent import race condition:** the limit is treated as a soft ceiling — in the unlikely scenario of two simultaneous bulk imports from the same org, a small overage is acceptable. Full per-row locking is out of scope for v1.
- The client always sends only the rows that passed client-side validation. Invalid rows are filtered out before the POST.

### `ProductService.bulkImport(rows, userId, organizationId)`

Processing model: **per-row commit** (not all-or-nothing). Each row is independent.

For each row:
1. Validate fields using a **bulk-aware variant of `validateProductData()`** that treats past `expiration_date` as a warning (not an error). The warning is returned in the response row result but does not prevent the row from being imported.
2. Look up `batch_number` via `findByBatchNumber(batchNumber, organizationId)`
3. If found → `updateProduct()`; if not → `createProduct()`
4. If `initial_stock > 0`:
   - Look up warehouse by name (case-insensitive trim) or use org default
   - If no warehouse resolves → skip stock, flag `stock_skipped: true` on the result row
   - If warehouse found → create `stock_movement` (type: `receive`)
   - Product upsert and stock movement are wrapped in a **single DB transaction per row** — if stock movement fails, the product upsert is rolled back for that row

Returns:
```json
{
  "created": 10,
  "updated": 5,
  "failed": [
    { "row": 3, "batch_number": "LOT-001", "errors": ["price must be positive"] }
  ],
  "stock_skipped": [
    { "row": 7, "batch_number": "LOT-005", "reason": "warehouse 'Deposito B' not found" }
  ]
}
```

### `ProductController.bulkImport()`

Follows existing controller pattern: extracts `organizationId` from `req.user`, enforces 500-row limit, delegates to service, returns structured response.

No DB schema changes — reuses existing tables and repositories.

---

## Frontend

### Step 2 badge (create vs. update distinction)

The preview step shows counts from **client-side validation only**: valid rows / invalid rows. The distinction between "to create" vs "to update" is shown in the **Step 3 result screen** after the server responds, not in Step 2. This avoids a pre-import DB lookup.

### User flow

```
[Products page] → "Importar CSV" button
  → ProductImportModal
      Step 1 — Upload
        - Drag & drop or file selector (.csv only, max 5 MB)
        - "Descargar plantilla CSV" button (client-side Blob download, no backend needed)
        - Validates row count ≤ 500 before proceeding

      Step 2 — Preview  (Papa Parse, client-side)
        - Warehouse names are pre-fetched when the modal opens (reuses existing warehouses API)
        - Table: valid rows ✅ / invalid rows ❌ with inline error messages
        - Rows with a `warehouse_name` not found in the org's warehouse list show ⚠️ "depósito no encontrado — se omitirá el stock"
        - Rows with blank `warehouse_name` and no org default warehouse show ⚠️ "sin depósito por defecto — se omitirá el stock"
        - Rows with past expiration_date show ⚠️ warning (not an error)
        - Badge: "X valid, Z with errors"
        - Actions: "Importar filas válidas (X)" | "Cancelar"
        - Only valid rows are sent in the POST body

      Step 3 — Result  (after POST /api/products/bulk-import)
        - Summary: created / updated / failed (server-side) / stock skipped
        - "failed" count refers only to server-side failures
        - "Close" button → invalidates ["products", organizationId] query key
```

### New files

| File | Purpose |
|---|---|
| `frontend/src/components/features/products/product-import-modal.tsx` | Import modal (3-step UI) |

### Modified files

| File | Change |
|---|---|
| `frontend/src/hooks/useProducts.ts` | Add `useProductImport()` hook |
| `frontend/src/services/api/productsService.ts` | Add `bulkImport(rows)` method |
| `frontend/src/pages/Dashboard/Products.tsx` | Add "Importar CSV" button + mount modal |
| `backend/services/ProductService.js` | Add `bulkImport()` method |
| `backend/controllers/ProductController.js` | Add `bulkImport()` method |
| `backend/routes/products.js` | Register `POST /bulk-import` route |

### Cache invalidation

On close after a successful import:
```ts
queryClient.invalidateQueries({ queryKey: ["products", organizationId] })
```
Scoped to current org — does not touch other orgs' caches.

### Dependencies

- **Papa Parse** (`papaparse`) — client-side CSV parsing

---

## Error handling

| Layer | What is caught | When shown |
|---|---|---|
| Client-side (Papa Parse) | Format errors, missing required fields, invalid enums/dates, file too large, too many rows | Step 2 preview |
| Server-side | DB conflicts, warehouse not found, any unexpected error per row | Step 3 result |

Past `expiration_date` is a **warning** (⚠️), not an error — the row is still imported.

---

## Validation rules summary

| Field | Rule |
|---|---|
| `price` | > 0, ≤ 999999.99 |
| `initial_stock` | integer ≥ 0 |
| `expiration_date` | valid YYYY-MM-DD; past date = warning only |
| `unit` | one of the allowed enum values, or empty (defaults to `unidad`) |
| `product_type` | one of the allowed enum values, or empty (defaults to `standard`) |
| `warehouse_name` | matched case-insensitively, trimmed; first match used if multiple exist |

---

## Out of scope

- Excel (.xlsx) support — CSV export from Google Sheets/Excel is sufficient
- Product formulas / recipes
- Tax rate assignment via CSV
- All-or-nothing transaction across the full import (per-row commit is intentional)
