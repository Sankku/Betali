---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# CSV Product Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CSV bulk-import system for products that supports upsert (create/update by batch_number), optional initial stock, client-side preview with error highlighting, and a 3-step modal UI.

**Architecture:** Client-side CSV parsing with Papa Parse provides instant preview; confirmed rows are sent as JSON to `POST /api/products/bulk-import`; the backend validates again, upserts each row, and optionally creates stock movements — all per-row (not all-or-nothing). The warehouse repository is injected into ProductService to resolve warehouse names.

**Tech Stack:** Node.js/Express (backend), React 18 + TypeScript + TanStack Query (frontend), Papa Parse (CSV parsing), Supabase (DB), Bun (package manager)

**Spec:** `docs/superpowers/specs/2026-03-26-csv-product-import-design.md`

---

## File Map

### New files
| File | Purpose |
|---|---|
| `frontend/src/components/features/products/product-import-modal.tsx` | 3-step import modal |

### Modified files
| File | Change |
|---|---|
| `backend/middleware/rateLimiting.js` | Add `bulkImportLimiter` export |
| `backend/services/ProductService.js` | Add `warehouseRepository` to constructor + `bulkImport()` + `_validateRowForBulk()` |
| `backend/config/container.js` | Inject `warehouseRepository` into `productService` registration |
| `backend/controllers/ProductController.js` | Add `bulkImport()` method |
| `backend/routes/products.js` | Register `POST /bulk-import` route |
| `backend/tests/unit/ProductService.unit.test.js` | Add `bulkImport` tests |
| `frontend/src/services/api/productsService.ts` | Add `bulkImport()` method |
| `frontend/src/hooks/useProducts.ts` | Add `useProductImport()` hook |
| `frontend/src/pages/Dashboard/Products.tsx` | Add "Importar CSV" button + mount modal |

---

## Task 1: Install Papa Parse

**Files:**
- Modify: `frontend/package.json` (via bun add)

- [ ] **Step 1: Install the package**

```bash
cd /path/to/project/frontend && bun add papaparse && bun add -d @types/papaparse
```

Expected output: packages added to `frontend/package.json` and `frontend/node_modules/`.

- [ ] **Step 2: Verify installation**

```bash
grep "papaparse" frontend/package.json
```

Expected: `"papaparse": "^x.x.x"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/bun.lockb
git commit -m "feat(products): install papaparse for CSV parsing"
```

---

## Task 2: Backend — `bulkImportLimiter`

**Files:**
- Modify: `backend/middleware/rateLimiting.js`

- [ ] **Step 1: Write the failing test** (verify the export doesn't exist yet)

```bash
node -e "const { bulkImportLimiter } = require('./backend/middleware/rateLimiting'); console.log(typeof bulkImportLimiter);"
```

Expected: `undefined` (not exported yet)

- [ ] **Step 2: Add the limiter**

In `backend/middleware/rateLimiting.js`, after the `searchLimiter` block (around line 77), add:

```js
/**
 * Strict rate limiting for bulk import operations.
 * Max 5 imports per user per 15 minutes.
 */
const bulkImportLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many import requests',
    message: 'Please wait before importing again',
    timestamp: new Date().toISOString()
  }
});
```

Also add `bulkImportLimiter` to the `module.exports` at the bottom of the file:

```js
module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  searchLimiter,
  speedLimiter,
  createUserLimiter,
  bulkImportLimiter
};
```

- [ ] **Step 3: Verify export**

```bash
node -e "const { bulkImportLimiter } = require('./backend/middleware/rateLimiting'); console.log(typeof bulkImportLimiter);"
```

Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add backend/middleware/rateLimiting.js
git commit -m "feat(products): add bulkImportLimiter (5 req/15min)"
```

---

## Task 3: Backend — `ProductService.bulkImport`

**Files:**
- Modify: `backend/services/ProductService.js`

This task adds:
1. `warehouseRepository` to the constructor (5th param, before `logger`)
2. `_validateRowForBulk(row)` — private method returning `{ errors, warnings }`
3. `bulkImport(rows, userId, organizationId)` — main import method

- [ ] **Step 1: Update constructor to accept `warehouseRepository`**

Find the constructor (line 6):
```js
constructor(productRepository, stockMovementRepository, stockReservationRepository, logger) {
```

Replace with:
```js
constructor(productRepository, stockMovementRepository, stockReservationRepository, warehouseRepository, logger) {
  this.repository = productRepository;
  this.stockMovementRepository = stockMovementRepository;
  this.stockReservationRepository = stockReservationRepository;
  this.warehouseRepository = warehouseRepository;
  this.logger = logger;
}
```

- [ ] **Step 2: Add `_validateRowForBulk(row)` private method**

Add this method before `validateProductData` (after `searchProducts`):

```js
/**
 * Validate a single row for bulk import.
 * Unlike validateProductData(), past expiration dates are a warning not an error.
 * @param {Object} row - Row data from CSV
 * @returns {{ errors: string[], warnings: string[] }}
 */
_validateRowForBulk(row) {
  const errors = [];
  const warnings = [];

  const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];
  const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];

  // Required fields
  for (const field of ['name', 'batch_number', 'origin_country', 'expiration_date', 'price']) {
    if (row[field] == null || String(row[field]).trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  // Expiration date
  if (row.expiration_date) {
    const d = new Date(row.expiration_date);
    if (isNaN(d.getTime())) {
      errors.push('expiration_date must be a valid date (YYYY-MM-DD)');
    } else if (d < new Date()) {
      warnings.push('expiration_date is in the past');
    }
  }

  // Price
  if (row.price != null && String(row.price).trim() !== '') {
    const price = parseFloat(row.price);
    if (isNaN(price) || price <= 0) {
      errors.push('price must be a positive number');
    } else if (price > 999999.99) {
      errors.push('price cannot exceed 999999.99');
    }
  }

  // initial_stock
  if (row.initial_stock != null && String(row.initial_stock).trim() !== '') {
    const stock = parseInt(row.initial_stock, 10);
    if (isNaN(stock) || stock < 0 || !Number.isInteger(Number(row.initial_stock))) {
      errors.push('initial_stock must be a non-negative integer');
    }
  }

  // unit
  if (row.unit && !VALID_UNITS.includes(row.unit)) {
    errors.push(`unit must be one of: ${VALID_UNITS.join(', ')}`);
  }

  // product_type
  if (row.product_type && !VALID_PRODUCT_TYPES.includes(row.product_type)) {
    errors.push(`product_type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`);
  }

  return { errors, warnings };
}
```

- [ ] **Step 3: Add `bulkImport(rows, userId, organizationId)` method**

Add after `_validateRowForBulk`:

```js
/**
 * Bulk import products from CSV rows (upsert by batch_number).
 * Processes each row independently (per-row commit, not all-or-nothing).
 * @param {Array} rows - Array of parsed CSV row objects
 * @param {string} userId - User performing the import
 * @param {string} organizationId - Organization scope
 * @returns {Promise<{ created: number, updated: number, failed: Array, stock_skipped: Array }>}
 */
async bulkImport(rows, userId, organizationId) {
  this.logger.info(`Starting bulk import of ${rows.length} rows for org: ${organizationId}`);

  // Pre-fetch all warehouses for this org (one query, not per-row)
  let orgWarehouses = [];
  try {
    orgWarehouses = await this.warehouseRepository.findByOrganizationId(organizationId);
  } catch (err) {
    this.logger.warn(`Could not fetch warehouses for bulk import: ${err.message}`);
  }

  const defaultWarehouse = orgWarehouses.find(w => w.is_active !== false) || orgWarehouses[0] || null;

  const result = { created: 0, updated: 0, failed: [], stock_skipped: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed for user-facing messages

    // Validate
    const { errors, warnings } = this._validateRowForBulk(row);
    if (errors.length > 0) {
      result.failed.push({ row: rowNum, batch_number: row.batch_number || null, errors });
      continue;
    }

    // Resolve defaults
    const productData = {
      name: String(row.name).trim(),
      batch_number: String(row.batch_number).trim(),
      origin_country: String(row.origin_country).trim(),
      expiration_date: row.expiration_date,
      price: parseFloat(row.price),
      description: row.description ? String(row.description).trim() : '',
      unit: row.unit || 'unidad',
      product_type: row.product_type || 'standard',
    };

    const initialStock = row.initial_stock ? parseInt(row.initial_stock, 10) : 0;
    const warehouseName = row.warehouse_name ? String(row.warehouse_name).trim().toLowerCase() : null;

    // Resolve warehouse
    let resolvedWarehouse = null;
    if (initialStock > 0) {
      if (warehouseName) {
        resolvedWarehouse = orgWarehouses.find(
          w => w.name.toLowerCase().trim() === warehouseName
        ) || null;
      } else {
        resolvedWarehouse = defaultWarehouse;
      }
    }

    try {
      // Upsert: check if batch_number exists
      const existing = await this.repository.findByBatchNumber(productData.batch_number, organizationId);
      let savedProduct;

      if (existing.length > 0) {
        // Update
        savedProduct = await this.repository.update(existing[0].product_id, {
          ...productData,
          updated_at: new Date().toISOString()
        }, 'product_id');
        result.updated++;
      } else {
        // Create
        savedProduct = await this.repository.create({
          ...productData,
          owner_id: userId,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        result.created++;
      }

      // Create stock movement if needed
      if (initialStock > 0) {
        if (!resolvedWarehouse) {
          const reason = warehouseName
            ? `warehouse '${row.warehouse_name}' not found`
            : 'no default warehouse available';
          result.stock_skipped.push({ row: rowNum, batch_number: productData.batch_number, reason });
        } else {
          try {
            await this.stockMovementRepository.create({
              product_id: savedProduct.product_id,
              warehouse_id: resolvedWarehouse.warehouse_id,
              organization_id: organizationId,
              movement_type: 'receive',
              quantity: initialStock,
              reference: 'CSV Import',
              movement_date: new Date().toISOString()
            });
          } catch (stockErr) {
            // Manual rollback: delete the product if it was just created
            if (existing.length === 0) {
              try {
                await this.repository.delete(savedProduct.product_id, 'product_id');
                result.created--;
              } catch (deleteErr) {
                this.logger.error(`Failed to rollback product ${savedProduct.product_id}: ${deleteErr.message}`);
              }
            } else {
              result.updated--;
            }
            result.failed.push({
              row: rowNum,
              batch_number: productData.batch_number,
              errors: [`Stock movement failed: ${stockErr.message}`]
            });
          }
        }
      }

      // Log warnings (past expiration, etc.) without failing
      if (warnings.length > 0) {
        this.logger.warn(`Row ${rowNum} (${productData.batch_number}) warnings: ${warnings.join(', ')}`);
      }

    } catch (err) {
      this.logger.error(`Row ${rowNum} failed: ${err.message}`);
      result.failed.push({
        row: rowNum,
        batch_number: row.batch_number || null,
        errors: [err.message]
      });
    }
  }

  this.logger.info(`Bulk import complete: created=${result.created}, updated=${result.updated}, failed=${result.failed.length}`);
  return result;
}
```

- [ ] **Step 4: Verify no syntax errors**

```bash
node -e "const { ProductService } = require('./backend/services/ProductService'); console.log('OK');"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/services/ProductService.js
git commit -m "feat(products): add bulkImport and _validateRowForBulk to ProductService"
```

---

## Task 4: Backend — Update `container.js`

**Files:**
- Modify: `backend/config/container.js`

- [ ] **Step 1: Inject `warehouseRepository` into `productService` registration**

Find the `productService` registration block (around line 265):

```js
container.register('productService', () => {
  const productRepository = container.get('productRepository');
  const stockMovementRepository = container.get('stockMovementRepository');
  const stockReservationRepository = container.get('stockReservationRepository');
  const logger = container.get('logger');
  return new ProductService(productRepository, stockMovementRepository, stockReservationRepository, logger);
}, true);
```

Replace with:

```js
container.register('productService', () => {
  const productRepository = container.get('productRepository');
  const stockMovementRepository = container.get('stockMovementRepository');
  const stockReservationRepository = container.get('stockReservationRepository');
  const warehouseRepository = container.get('warehouseRepository');
  const logger = container.get('logger');
  return new ProductService(productRepository, stockMovementRepository, stockReservationRepository, warehouseRepository, logger);
}, true);
```

- [ ] **Step 2: Verify**

```bash
node -e "const { container } = require('./backend/config/container'); const svc = container.get('productService'); console.log(typeof svc.bulkImport);"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add backend/config/container.js
git commit -m "feat(products): inject warehouseRepository into ProductService"
```

---

## Task 5: Backend — `ProductController.bulkImport`

**Files:**
- Modify: `backend/controllers/ProductController.js`

- [ ] **Step 1: Add `bulkImport` method**

Add this method before `buildQueryOptions` (before the last method of the class):

```js
/**
 * Bulk import products from CSV
 * POST /api/products/bulk-import
 */
async bulkImport(req, res, next) {
  try {
    const userId = req.user.id;
    const organizationId = req.user.currentOrganizationId;
    const { products: rows } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        error: 'No organization context found. Please select an organization.'
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'products array is required and must not be empty' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ error: 'Cannot import more than 500 products at once' });
    }

    // Check plan limit: req.organizationLimits is set by checkOrganizationLimit middleware
    if (req.organizationLimits) {
      const { remaining } = req.organizationLimits;
      // Count only new products (not updates) — we don't know yet, so use total rows as conservative estimate
      if (rows.length > remaining) {
        return res.status(403).json({
          error: `This import would exceed your plan limit. You can create ${remaining} more products.`,
          code: 'LIMIT_EXCEEDED',
          details: req.organizationLimits
        });
      }
    }

    const result = await this.productService.bulkImport(rows, userId, organizationId);

    res.status(200).json({
      data: result,
      message: `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed.length} failed`
    });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
node -e "const { ProductController } = require('./backend/controllers/ProductController'); console.log('OK');"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/ProductController.js
git commit -m "feat(products): add bulkImport controller method"
```

---

## Task 6: Backend — Register Route

**Files:**
- Modify: `backend/routes/products.js`

- [ ] **Step 1: Add `bulkImportLimiter` to the import line**

Find line 6:
```js
const { createLimiter, searchLimiter } = require('../middleware/rateLimiting');
```
Replace with:
```js
const { createLimiter, searchLimiter, bulkImportLimiter } = require('../middleware/rateLimiting');
```

- [ ] **Step 2: Add the route**

Add this route BEFORE the existing `router.post('/', ...)` block (before line 87). It must come before `/:id` routes to avoid param conflicts:

```js
router.post(
  '/bulk-import',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  checkOrganizationLimit('products'),
  bulkImportLimiter,
  async (req, res, next) => {
    try {
      await productController.bulkImport(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);
```

- [ ] **Step 3: Verify route loads without error**

```bash
node -e "const router = require('./backend/routes/products'); console.log('OK');"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/routes/products.js
git commit -m "feat(products): register POST /bulk-import route"
```

---

## Task 7: Backend — Unit Tests for `bulkImport`

**Files:**
- Modify: `backend/tests/unit/ProductService.unit.test.js`

- [ ] **Step 1: Add `mockWarehouseRepository` and `create` mock to `beforeEach` and update service instantiation**

Find the `beforeEach` block in `ProductService.unit.test.js`.

1. After the `mockStockReservationRepository` object, add:

```js
mockWarehouseRepository = {
  findByOrganizationId: jest.fn()
};
```

2. Add `create: jest.fn()` to the existing `mockStockMovementRepository` object:

```js
mockStockMovementRepository = {
  getCurrentStockBulk: jest.fn(),
  getCurrentStock: jest.fn(),
  create: jest.fn()   // ← ADD THIS LINE
};
```

3. Update the `productService = new ProductService(...)` line:
```js
productService = new ProductService(
  mockProductRepository,
  mockStockMovementRepository,
  mockStockReservationRepository,
  mockWarehouseRepository,
  mockLogger
);
```

4. Add `let mockWarehouseRepository;` with the other `let` declarations at the top of the describe block.

- [ ] **Step 2: Add test suite for `bulkImport`**

Add this describe block at the end of the file, inside the outer `describe`:

```js
describe('bulkImport', () => {
  const orgId = 'org-123';
  const userId = 'user-abc';

  const validRow = {
    name: 'Producto A',
    batch_number: 'LOT-001',
    origin_country: 'Argentina',
    expiration_date: '2030-01-01',
    price: '100.00',
    unit: 'kg',
    product_type: 'standard',
    initial_stock: '0',
    warehouse_name: ''
  };

  beforeEach(() => {
    mockWarehouseRepository.findByOrganizationId.mockResolvedValue([]);
    mockProductRepository.findByBatchNumber.mockResolvedValue([]);
    mockProductRepository.create.mockResolvedValue({ product_id: 'prod-new', ...validRow });
    mockProductRepository.update.mockResolvedValue({ product_id: 'prod-existing', ...validRow });
  });

  test('creates a new product when batch_number does not exist', async () => {
    const result = await productService.bulkImport([validRow], userId, orgId);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.failed).toHaveLength(0);
    expect(mockProductRepository.create).toHaveBeenCalledTimes(1);
  });

  test('updates existing product when batch_number already exists', async () => {
    mockProductRepository.findByBatchNumber.mockResolvedValue([{ product_id: 'prod-existing' }]);

    const result = await productService.bulkImport([validRow], userId, orgId);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(mockProductRepository.update).toHaveBeenCalledTimes(1);
  });

  test('marks row as failed when required field is missing', async () => {
    const row = { ...validRow, name: '' };

    const result = await productService.bulkImport([row], userId, orgId);

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].errors).toContain('name is required');
    expect(result.created).toBe(0);
  });

  test('treats past expiration_date as warning, not error', async () => {
    const row = { ...validRow, expiration_date: '2000-01-01' };

    const result = await productService.bulkImport([row], userId, orgId);

    expect(result.created).toBe(1);
    expect(result.failed).toHaveLength(0);
  });

  test('creates stock movement when initial_stock > 0 and warehouse found', async () => {
    const warehouse = { warehouse_id: 'wh-1', name: 'Principal', is_active: true };
    mockWarehouseRepository.findByOrganizationId.mockResolvedValue([warehouse]);
    mockStockMovementRepository.create = jest.fn().mockResolvedValue({});

    const row = { ...validRow, initial_stock: '10', warehouse_name: 'Principal' };

    const result = await productService.bulkImport([row], userId, orgId);

    expect(result.created).toBe(1);
    expect(mockStockMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouse_id: 'wh-1',
        quantity: 10,
        movement_type: 'receive'
      })
    );
  });

  test('skips stock when warehouse_name not found', async () => {
    mockWarehouseRepository.findByOrganizationId.mockResolvedValue([
      { warehouse_id: 'wh-1', name: 'Principal', is_active: true }
    ]);
    const row = { ...validRow, initial_stock: '10', warehouse_name: 'DepositoNoExiste' };

    const result = await productService.bulkImport([row], userId, orgId);

    expect(result.created).toBe(1);
    expect(result.stock_skipped).toHaveLength(1);
    expect(result.stock_skipped[0].reason).toContain('not found');
  });

  test('processes multiple rows independently — one failure does not block others', async () => {
    const badRow = { ...validRow, batch_number: 'BAD', price: '-1' };
    const goodRow = { ...validRow, batch_number: 'GOOD' };

    const result = await productService.bulkImport([badRow, goodRow], userId, orgId);

    expect(result.created).toBe(1);
    expect(result.failed).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd backend && bun run test -- --testPathPattern="ProductService.unit"
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/unit/ProductService.unit.test.js
git commit -m "test(products): add bulkImport unit tests for ProductService"
```

---

## Task 8: Frontend — `productsService.bulkImport`

**Files:**
- Modify: `frontend/src/services/api/productsService.ts`

- [ ] **Step 1: Add types and `bulkImport` method**

Add these types before `export const productsService`:

```ts
export interface ProductImportRow {
  name: string;
  batch_number: string;
  origin_country: string;
  expiration_date: string;
  price: string | number;
  description?: string;
  unit?: string;
  product_type?: string;
  initial_stock?: string | number;
  warehouse_name?: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  failed: { row: number; batch_number: string | null; errors: string[] }[];
  stock_skipped: { row: number; batch_number: string; reason: string }[];
}
```

Add this method inside `productsService` (after `getAvailableStock`):

```ts
async bulkImport(rows: ProductImportRow[]): Promise<BulkImportResult> {
  try {
    const response = await httpClient.post<{ data: BulkImportResult }>(
      '/api/products/bulk-import',
      { products: rows }
    );
    return response.data || response;
  } catch (error) {
    console.error('Error in bulk import:', error);
    throw error;
  }
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && bun run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/productsService.ts
git commit -m "feat(products): add bulkImport method to productsService"
```

---

## Task 9: Frontend — `useProductImport` hook

**Files:**
- Modify: `frontend/src/hooks/useProducts.ts`

- [ ] **Step 1: Add `useProductImport` hook**

At the top of `frontend/src/hooks/useProducts.ts`, add to the existing imports from `productsService`:

```ts
import type { ProductImportRow } from '../services/api/productsService';
```

Then add this hook at the end of the file:

```ts
export function useProductImport() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (rows: ProductImportRow[]) =>
      productsService.bulkImport(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products', currentOrganization?.organization_id]
      });
    },
    onError: (error: Error) => {
      console.error('Bulk import error:', error);
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && bun run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useProducts.ts
git commit -m "feat(products): add useProductImport hook"
```

---

## Task 10: Frontend — `ProductImportModal` component

**Files:**
- Create: `frontend/src/components/features/products/product-import-modal.tsx`

This is a 3-step modal: (1) Upload, (2) Preview, (3) Result. It uses Papa Parse for client-side CSV parsing and the `useWarehouses` hook (from `frontend/src/hooks/useWarehouse.ts`) to pre-fetch warehouse names for warning display.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/features/products/product-import-modal.tsx`:

```tsx
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

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function validateRow(row: Record<string, string>, rowNum: number, warehouseNames: string[]): ParsedRow {
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
    if (isNaN(p) || p <= 0) errors.push('price debe ser un número positivo');
    else if (p > 999999.99) errors.push('price no puede superar 999999.99');
  }

  if (row.initial_stock) {
    const s = parseInt(row.initial_stock, 10);
    if (isNaN(s) || s < 0) errors.push('initial_stock debe ser un entero ≥ 0');
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

  return {
    rowNum,
    data: row as unknown as ProductImportRow,
    errors,
    warnings
  };
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
  const warehouseNames = (warehousesData?.data ?? []).map((w: any) => w.name.toLowerCase().trim());

  const importMutation = useProductImport();

  const handleClose = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  const handleFileChange = useCallback((file: File | null) => {
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

        // Check headers
        const headers = Object.keys(results.data[0]);
        const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setParseError(`Faltan columnas requeridas: ${missing.join(', ')}`);
          return;
        }

        const rows = results.data.map((row, i) => validateRow(row, i + 1, warehouseNames));
        setParsedRows(rows);
        setStep('preview');
      },
      error: (err) => {
        setParseError(`Error al parsear el CSV: ${err.message}`);
      }
    });
  }, [warehouseNames]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files[0] ?? null);
  }, [handleFileChange]);

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    try {
      const result = await importMutation.mutateAsync(validRows.map(r => r.data));
      setImportResult(result);
      setStep('result');
    } catch {
      // error handled by mutation
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
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Arrastrá tu archivo CSV aquí o <span className="text-blue-600 underline">seleccioná uno</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Solo .csv · Máx {MAX_FILE_SIZE_MB} MB · Máx {MAX_ROWS} filas</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Descargar plantilla CSV
            </Button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
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
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Lote</th>
                    <th className="px-2 py-1 text-left">Nombre</th>
                    <th className="px-2 py-1 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map(row => (
                    <tr key={row.rowNum} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-2 py-1 text-gray-500">{row.rowNum}</td>
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
                  <div className="text-2xl font-bold text-amber-700">{importResult.stock_skipped.length}</div>
                  <div className="text-amber-600">Stock omitido</div>
                </div>
              )}
            </div>

            {importResult.failed.length > 0 && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                {importResult.failed.map(f => (
                  <div key={f.row}>Fila {f.row} ({f.batch_number}): {f.errors.join(', ')}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        )}
        {step === 'preview' && (
          <>
            <Button variant="outline" onClick={() => setStep('upload')}>Volver</Button>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && bun run build 2>&1 | grep -E "error TS" | head -10
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/products/product-import-modal.tsx
git commit -m "feat(products): add ProductImportModal with 3-step CSV import flow"
```

---

## Task 11: Frontend — Wire up in `Products.tsx`

**Files:**
- Modify: `frontend/src/pages/Dashboard/Products.tsx`

- [ ] **Step 1: Read the current state of `Products.tsx`**

Read `frontend/src/pages/Dashboard/Products.tsx` to find where the "Create" button is rendered and how the existing modal state is managed.

- [ ] **Step 2: Add import and state**

At the top of `Products.tsx`, add the import:
```ts
import { ProductImportModal } from '../../components/features/products/product-import-modal';
```

Inside the component, add state:
```ts
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
```

- [ ] **Step 3: Add the "Importar CSV" button**

Near the existing "Nuevo Producto" / create button, add:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setIsImportModalOpen(true)}
  className="flex items-center gap-2"
>
  <Upload className="h-4 w-4" />
  Importar CSV
</Button>
```

Add `Upload` to the lucide-react import if not already present.

- [ ] **Step 4: Mount the modal**

Near the other modals at the bottom of the JSX, add:
```tsx
<ProductImportModal
  isOpen={isImportModalOpen}
  onClose={() => setIsImportModalOpen(false)}
/>
```

- [ ] **Step 5: Verify TypeScript compiles and app starts**

```bash
cd frontend && bun run build 2>&1 | grep -E "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Dashboard/Products.tsx
git commit -m "feat(products): add Importar CSV button and mount ProductImportModal"
```

---

## Verification Checklist

After all tasks are complete, manually verify the happy path:

- [ ] Descargar plantilla CSV → abre un archivo CSV con los headers correctos y una fila de ejemplo
- [ ] Subir CSV con filas válidas → paso 2 muestra todas en verde
- [ ] Subir CSV con filas con errores → paso 2 muestra errores en rojo por fila
- [ ] Subir CSV con fecha de vencimiento en el pasado → paso 2 muestra ⚠️ warning, fila se puede importar
- [ ] Subir CSV con warehouse_name inválido → paso 2 muestra ⚠️ warning de depósito
- [ ] Click "Importar filas válidas" → paso 3 muestra summary (creados/actualizados/fallidos)
- [ ] Cerrar modal → la tabla de productos se actualiza con los nuevos productos
- [ ] Subir archivo > 5MB → mensaje de error
- [ ] Subir archivo > 500 filas → mensaje de error
- [ ] Subir CSV con columnas faltantes → mensaje de error claro
