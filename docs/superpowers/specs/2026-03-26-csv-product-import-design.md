# CSV Product Import — Design Spec
**Date:** 2026-03-26
**Status:** Approved

## Overview

A system for bulk-loading products via CSV files, supporting upsert (create + update) and optional initial stock. The import flow includes a client-side preview step with error highlighting before committing to the database.

---

## CSV Template Structure

| Column | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Product name |
| `batch_number` | string | ✅ | Lot number — **upsert key** |
| `origin_country` | string | ✅ | Country of origin |
| `expiration_date` | date (YYYY-MM-DD) | ✅ | Expiration date |
| `price` | number | ✅ | Price (e.g. 1500.50) |
| `description` | string | — | Optional description |
| `unit` | enum | — | kg, g, mg, l, ml, unidad, docena |
| `product_type` | enum | — | standard, raw_material, finished_good |
| `initial_stock` | number | — | Initial stock quantity |
| `warehouse_name` | string | — | Warehouse name for stock; falls back to org default |

**Upsert key:** `batch_number` scoped to `organizationId`. If it exists → update; otherwise → create.

**Stock:** if `initial_stock > 0`, create a `stock_movement` of type `receive` in the specified warehouse (or default warehouse if none given).

---

## Backend

### New endpoint

```
POST /api/products/bulk-import
Middleware: authenticateUser, requireOrganizationContext, requirePermission(PRODUCTS_CREATE), createLimiter
Body: { products: ProductImportRow[], importOnlyValid: boolean }
```

### `ProductService.bulkImport(rows, userId, organizationId)`

For each row:
1. Validate fields using existing `validateProductData()`
2. Look up `batch_number` via `findByBatchNumber(batchNumber, organizationId)`
3. If found → `updateProduct()`; if not → `createProduct()`
4. If `initial_stock > 0` → find warehouse by `warehouse_name` (or use org default) → create `stock_movement` (type: `receive`)

Returns: `{ created: number, updated: number, failed: { row: number, errors: string[] }[] }`

### `ProductController.bulkImport()`

Follows existing controller pattern: extracts `organizationId` from `req.user`, delegates to service, returns structured response.

No schema changes — reuses existing tables and repositories.

---

## Frontend

### User flow

```
[Products page] → "Importar CSV" button
  → ProductImportModal
      Step 1 — Upload
        - Drag & drop or file selector
        - "Descargar plantilla CSV" button (client-side Blob download)

      Step 2 — Preview  (Papa Parse, runs client-side)
        - Table: valid rows ✅ / invalid rows ❌ with error messages
        - Badge: "X to create, Y to update, Z with errors"
        - Actions: "Importar filas válidas" | "Cancelar"

      Step 3 — Result  (after POST /api/products/bulk-import)
        - Summary: created / updated / failed
        - "Close" button → invalidates ["products"] query
```

### New files

| File | Purpose |
|---|---|
| `frontend/src/components/features/products/product-import-modal.tsx` | Import modal (3-step UI) |
| Template download | Inline function in modal — generates CSV Blob, no backend endpoint needed |

### Modified files

| File | Change |
|---|---|
| `frontend/src/hooks/useProducts.ts` | Add `useProductImport()` hook (parse + API call) |
| `frontend/src/services/api/productsService.ts` | Add `bulkImport(rows, importOnlyValid)` method |
| `frontend/src/pages/Dashboard/Products.tsx` | Add "Importar CSV" button + mount modal |
| `backend/services/ProductService.js` | Add `bulkImport()` method |
| `backend/controllers/ProductController.js` | Add `bulkImport()` method |
| `backend/routes/products.js` | Register `POST /bulk-import` route |

### Dependencies

- **Papa Parse** (`papaparse`) — client-side CSV parsing (lightweight, no backend needed)

---

## Error handling

- Client-side: format errors, missing required fields, invalid enums/dates — shown in preview step
- Server-side: duplicate batch conflicts, warehouse not found, DB errors — returned in response and shown in result step
- The user can choose "Import valid rows only" or "Cancel and fix" from the preview step

---

## Out of scope

- Excel (.xlsx) support — CSV export from Google Sheets/Excel is sufficient
- Product formulas / recipes — not included in import
- Tax rate assignment via CSV — not included
