---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# PO Lot Reception Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a purchase order is received, users assign each line item to a lot (new or existing), creating stock movements and updating PO status atomically.

**Architecture:** New `POST /api/purchase-orders/:id/receive` endpoint calls `PurchaseOrderService.receivePurchaseOrder`, which validates, creates lots if needed, inserts stock movements, and derives PO status from the full set of detail lines. Frontend replaces the batch-confirm modal with a `ReceivePurchaseOrderModal` with inline lot assignment per line.

**Tech Stack:** Node.js + Express + Supabase (via PostgREST client), React 18 + TypeScript + TanStack Query + Tailwind CSS v4

---

## File Map

### New files
- `backend/scripts/migrations/015_add_lot_id_to_purchase_order_details.sql`
- `backend/tests/unit/services/PurchaseOrderService.unit.test.js`
- `frontend/src/components/features/purchase-orders/ReceiptLineRow.tsx`
- `frontend/src/components/features/purchase-orders/ReceivePurchaseOrderModal.tsx`

### Modified files
- `backend/server.js` — fix shared Express router instance bug
- `backend/services/PurchaseOrderService.js` — add `receivePurchaseOrder`, update constructor, deprecate `handlePurchaseOrderReceived`
- `backend/repositories/PurchaseOrderDetailRepository.js` — add `updateReceivedQuantityAndLot`
- `backend/controllers/PurchaseOrderController.js` — add `receivePurchaseOrder` handler
- `backend/routes/purchase-orders.js` — add `POST /:id/receive` route
- `backend/config/container.js` — inject `productLotRepository` into `purchaseOrderService`
- `frontend/src/types/purchaseOrders.ts` — add `ReceiptLine`, `ReceivePurchaseOrderPayload`, update `PurchaseOrderDetail`
- `frontend/src/services/api/purchaseOrdersService.ts` — add `receive(id, lines)`
- `frontend/src/hooks/usePurchaseOrders.ts` — update `useReceivePurchaseOrder`
- `frontend/src/components/features/purchase-orders/PurchaseOrdersPage.tsx` — wire bulk action to new modal

---

## Task 1: DB migration — add `lot_id` to `purchase_order_details`

**Files:**
- Create: `backend/scripts/migrations/015_add_lot_id_to_purchase_order_details.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 015_add_lot_id_to_purchase_order_details.sql
-- Adds lot_id FK to purchase_order_details so each received line tracks which lot it was assigned to

ALTER TABLE purchase_order_details
  ADD COLUMN IF NOT EXISTS lot_id UUID
    REFERENCES product_lots(lot_id)
    ON DELETE SET NULL;

COMMENT ON COLUMN purchase_order_details.lot_id IS
  'Lot assigned to this line on first reception. NULL until the line is first received.';
```

- [ ] **Step 2: Run migration in Supabase dashboard SQL editor**

Open the Supabase SQL editor for this project and paste + run the contents of `015_add_lot_id_to_purchase_order_details.sql`.

Expected: no error, column `lot_id` appears in `purchase_order_details` table.

- [ ] **Step 3: Commit**

```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots
git add backend/scripts/migrations/015_add_lot_id_to_purchase_order_details.sql
git commit -m "feat: add lot_id column to purchase_order_details"
```

---

## Task 2: Fix shared Express router instance bug

> **Note on `ProductTypeService.deleteType`:** The spec's "Pre-existing Bugs" section mentions a `head: true` issue in this method. On inspection, the actual code uses a regular `.select('lot_id')` (not `head: true`), so `lots?.length` correctly reads row data. No fix is needed for this method.

**Context:** `backend/server.js` lines 201–202 mount the same `productLotRoutes` router object at two paths. Express cannot share one router instance across two mount points with different param contexts. Fix by requiring a fresh instance for each mount.

**Files:**
- Modify: `backend/routes/productLots.js` — export a factory function instead of a singleton router
- Modify: `backend/server.js` — call the factory twice

- [ ] **Step 1: Read `backend/routes/productLots.js` top and bottom to understand current export**

Look for how `module.exports = router` is done at the bottom.

- [ ] **Step 2: Wrap router creation in a factory and export it**

At the bottom of `backend/routes/productLots.js`, change from:
```js
// Before:
const router = express.Router({ mergeParams: true });
// ... route definitions ...
module.exports = router;
```

To:
```js
// After:
function createProductLotRouter() {
  const router = express.Router({ mergeParams: true });
  // ... paste all existing route definitions here unchanged ...
  return router;
}

module.exports = createProductLotRouter;
```

> **Important:** All the route handler code stays exactly the same — only the export wrapping changes.

- [ ] **Step 3: Update `backend/server.js` to call the factory twice**

```js
// Before (line ~17):
const productLotRoutes = require('./routes/productLots');
// ...
this.app.use('/api/product-types/:typeId/lots', productLotRoutes);
this.app.use('/api/product-lots', productLotRoutes);

// After:
const createProductLotRouter = require('./routes/productLots');
// ...
this.app.use('/api/product-types/:typeId/lots', createProductLotRouter());
this.app.use('/api/product-lots', createProductLotRouter());
```

- [ ] **Step 4: Start backend and verify routes still work**

```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant
bun run back
```

Expected: server starts without errors. In a second terminal:
```bash
curl -s http://localhost:4000/api/product-lots -H "Authorization: Bearer test" | head -20
```
Expected: 401 (auth required — routes are mounted correctly).

- [ ] **Step 5: Commit**

```bash
git add backend/routes/productLots.js backend/server.js
git commit -m "fix: use router factory to avoid shared Express instance at two mount paths"
```

---

## Task 3: Add `updateReceivedQuantityAndLot` to `PurchaseOrderDetailRepository`

**Context:** The service needs to update both `received_quantity` and `lot_id` on a detail row in one call.

**Files:**
- Modify: `backend/repositories/PurchaseOrderDetailRepository.js`

- [ ] **Step 1: Read `PurchaseOrderDetailRepository.js` to understand existing update pattern**

Look for existing `updateReceivedQuantity` method — it will show the Supabase update pattern used.

- [ ] **Step 2: Add `updateReceivedQuantityAndLot` method**

Find the class and add after `updateReceivedQuantity`:

```js
/**
 * Update both received_quantity and lot_id for a detail line
 * @param {string} detailId
 * @param {number} newReceivedQuantity - Total received so far (not delta)
 * @param {string} lotId
 * @param {string} organizationId
 */
async updateReceivedQuantityAndLot(detailId, newReceivedQuantity, lotId, organizationId) {
  const { data, error } = await this.client
    .from('purchase_order_details')
    .update({ received_quantity: newReceivedQuantity, lot_id: lotId })
    .eq('detail_id', detailId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw new Error(`Error updating detail: ${error.message}`);
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/PurchaseOrderDetailRepository.js
git commit -m "feat: add updateReceivedQuantityAndLot to PurchaseOrderDetailRepository"
```

---

## Task 4: Write failing unit tests for `receivePurchaseOrder`

**Files:**
- Create: `backend/tests/unit/services/PurchaseOrderService.unit.test.js`

- [ ] **Step 1: Create the test file**

```js
// backend/tests/unit/services/PurchaseOrderService.unit.test.js
const PurchaseOrderService = require('../../../services/PurchaseOrderService');

describe('PurchaseOrderService.receivePurchaseOrder', () => {
  let service;
  let mockPoRepo, mockDetailRepo, mockSupplierRepo, mockTypeRepo,
      mockWarehouseRepo, mockStockRepo, mockLotRepo, mockLogger;

  const ORG = 'org-1';
  const PO_ID = 'po-1';
  const WAREHOUSE_ID = 'wh-1';

  beforeEach(() => {
    mockPoRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockDetailRepo = {
      findByPurchaseOrderId: jest.fn(),
      updateReceivedQuantityAndLot: jest.fn(),
    };
    mockSupplierRepo = { findById: jest.fn() };
    mockTypeRepo = { findById: jest.fn() };
    mockWarehouseRepo = { findById: jest.fn() };
    mockStockRepo = {
      create: jest.fn(),
      delete: jest.fn(),
    };
    mockLotRepo = {
      findById: jest.fn(),
      findByLotNumber: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = new PurchaseOrderService(
      mockPoRepo, mockDetailRepo, mockSupplierRepo, mockTypeRepo,
      mockWarehouseRepo, mockStockRepo, mockLogger, mockLotRepo
    );
  });

  const makePo = (status = 'approved') => ({
    purchase_order_id: PO_ID,
    warehouse_id: WAREHOUSE_ID,
    status,
    purchase_order_number: 'OC-0001',
    organization_id: ORG,
  });

  const makeDetail = (overrides = {}) => ({
    detail_id: 'det-1',
    purchase_order_id: PO_ID,
    product_type_id: 'pt-1',
    quantity: 10,
    received_quantity: 0,
    unit_price: 100,
    lot_id: null,
    organization_id: ORG,
    ...overrides,
  });

  describe('validations', () => {
    test('throws 404 when PO not found', async () => {
      mockPoRepo.findById.mockResolvedValue(null);
      await expect(service.receivePurchaseOrder(PO_ID, [], ORG))
        .rejects.toMatchObject({ status: 404 });
    });

    test('throws 409 when PO is not approved or partially_received', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo('draft'));
      await expect(service.receivePurchaseOrder(PO_ID, [], ORG))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws 400 on duplicate detail_id in payload', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [
        { detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } },
        { detail_id: 'det-1', received_quantity: 3, lot: { mode: 'new', lot_number: 'L2', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } },
      ];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when detail_id does not belong to PO', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [{ detail_id: 'unknown-det', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when received_quantity is zero', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      const lines = [{ detail_id: 'det-1', received_quantity: 0, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 400 when received_quantity exceeds remaining', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail({ received_quantity: 8 })]);
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 400 });
    });

    test('throws 409 when new lot_number already exists in org', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findByLotNumber.mockResolvedValue({ lot_id: 'existing-lot' });
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws 404 when existing lot not found or wrong product_type_id', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findById.mockResolvedValue({ lot_id: 'lot-1', product_type_id: 'WRONG-TYPE' });
      const lines = [{ detail_id: 'det-1', received_quantity: 5, lot: { mode: 'existing', lot_id: 'lot-1' } }];
      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('happy path', () => {
    test('creates new lot, stock movement, updates detail, sets status=received when all complete', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce([makeDetail()])   // initial load
        .mockResolvedValueOnce([makeDetail({ received_quantity: 10 })]); // after updates
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('received'));

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 10,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await service.receivePurchaseOrder(PO_ID, lines, ORG);

      expect(mockLotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_number: 'L1', product_type_id: 'pt-1' }),
        ORG
      );
      expect(mockStockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_id: 'new-lot-1', warehouse_id: WAREHOUSE_ID, movement_type: 'entry', quantity: 10 })
      );
      expect(mockDetailRepo.updateReceivedQuantityAndLot).toHaveBeenCalledWith('det-1', 10, 'new-lot-1', ORG);
      expect(mockPoRepo.updateStatus).toHaveBeenCalledWith(PO_ID, 'received', ORG, expect.any(String));
    });

    test('sets status=partially_received when not all lines complete', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      const details = [makeDetail(), makeDetail({ detail_id: 'det-2', received_quantity: 0 })];
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce(details)
        .mockResolvedValueOnce([makeDetail({ received_quantity: 5 }), makeDetail({ detail_id: 'det-2', received_quantity: 0 })]);
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('partially_received'));

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 5,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await service.receivePurchaseOrder(PO_ID, lines, ORG);
      expect(mockPoRepo.updateStatus).toHaveBeenCalledWith(PO_ID, 'partially_received', ORG, null);
    });

    test('skips lot creation when detail already has lot_id', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo('partially_received'));
      mockDetailRepo.findByPurchaseOrderId
        .mockResolvedValueOnce([makeDetail({ received_quantity: 5, lot_id: 'existing-lot-1' })])
        .mockResolvedValueOnce([makeDetail({ received_quantity: 10, lot_id: 'existing-lot-1' })]);
      mockStockRepo.create.mockResolvedValue({ movement_id: 'mov-1' });
      mockDetailRepo.updateReceivedQuantityAndLot.mockResolvedValue({});
      mockPoRepo.updateStatus.mockResolvedValue({});
      mockPoRepo.findById.mockResolvedValueOnce(makePo('received'));

      const lines = [{ detail_id: 'det-1', received_quantity: 5 }]; // no lot field — uses existing

      await service.receivePurchaseOrder(PO_ID, lines, ORG);
      expect(mockLotRepo.create).not.toHaveBeenCalled();
      expect(mockStockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lot_id: 'existing-lot-1' })
      );
    });

    test('compensating rollback deletes inserted lot and movement on error', async () => {
      mockPoRepo.findById.mockResolvedValue(makePo());
      mockDetailRepo.findByPurchaseOrderId.mockResolvedValue([makeDetail()]);
      mockLotRepo.findByLotNumber.mockResolvedValue(null);
      mockLotRepo.create.mockResolvedValue({ lot_id: 'new-lot-1' });
      mockStockRepo.create.mockRejectedValue(new Error('DB error')); // fail at step 2
      mockLotRepo.delete.mockResolvedValue({});

      const lines = [{
        detail_id: 'det-1',
        received_quantity: 5,
        lot: { mode: 'new', lot_number: 'L1', expiration_date: '2027-01-01', origin_country: 'AR', price: 100 },
      }];

      await expect(service.receivePurchaseOrder(PO_ID, lines, ORG)).rejects.toThrow('DB error');
      expect(mockLotRepo.delete).toHaveBeenCalledWith('new-lot-1', ORG);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail (service method doesn't exist yet)**

```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots
bun run test -- --testPathPattern="PurchaseOrderService.unit"
```

Expected: all tests fail with "service.receivePurchaseOrder is not a function" or similar.

- [ ] **Step 3: Commit failing tests**

```bash
git add backend/tests/unit/services/PurchaseOrderService.unit.test.js
git commit -m "test: add failing unit tests for PurchaseOrderService.receivePurchaseOrder"
```

---

## Task 5: Implement `PurchaseOrderService.receivePurchaseOrder`

**Files:**
- Modify: `backend/services/PurchaseOrderService.js`

- [ ] **Step 1: Update constructor to accept `productLotRepository` as 8th argument**

Find the constructor and add the new param:

```js
constructor(
  purchaseOrderRepository,
  purchaseOrderDetailRepository,
  supplierRepository,
  productTypeRepository,
  warehouseRepository,
  stockMovementRepository,
  logger,
  productLotRepository   // ← new, 8th argument
) {
  // existing assignments...
  this.productLotRepository = productLotRepository;
}
```

- [ ] **Step 2: Add `receivePurchaseOrder` method**

Add after `updatePurchaseOrderStatus`:

```js
/**
 * Receive a purchase order: assign lots and create stock entry movements.
 * @param {string} purchaseOrderId
 * @param {Array}  lines - [{ detail_id, received_quantity, lot? }]
 * @param {string} organizationId
 * @returns {Promise<Object>} updated purchase order
 */
async receivePurchaseOrder(purchaseOrderId, lines, organizationId) {
  this.logger.info('Processing purchase order reception', { purchaseOrderId, organizationId });

  // 1. Load PO
  const po = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
  if (!po) {
    const err = new Error('Purchase order not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate status
  if (!['approved', 'partially_received'].includes(po.status)) {
    const err = new Error(`Cannot receive purchase order with status "${po.status}"`);
    err.status = 409;
    throw err;
  }

  // 3. Validate no duplicate detail_ids
  const detailIds = lines.map(l => l.detail_id);
  if (new Set(detailIds).size !== detailIds.length) {
    const err = new Error('Duplicate detail_id entries in payload');
    err.status = 400;
    throw err;
  }

  // 4. Load all details for this PO
  const allDetails = await this.purchaseOrderDetailRepository.findByPurchaseOrderId(purchaseOrderId, organizationId);
  const detailMap = Object.fromEntries(allDetails.map(d => [d.detail_id, d]));

  // 5. Pre-write validations
  for (const line of lines) {
    const detail = detailMap[line.detail_id];
    if (!detail) {
      const err = new Error(`detail_id not found: ${line.detail_id}`);
      err.status = 400;
      throw err;
    }
    if (!line.received_quantity || line.received_quantity <= 0) {
      const err = new Error(`received_quantity must be > 0 for detail ${line.detail_id}`);
      err.status = 400;
      throw err;
    }
    const remaining = detail.quantity - (detail.received_quantity || 0);
    if (line.received_quantity > remaining) {
      const err = new Error(`received_quantity (${line.received_quantity}) exceeds remaining (${remaining}) for detail ${line.detail_id}`);
      err.status = 400;
      throw err;
    }
    // Lot validations (only needed when detail has no lot yet)
    if (!detail.lot_id) {
      if (!line.lot) {
        const err = new Error(`lot is required for detail ${line.detail_id} (no lot assigned yet)`);
        err.status = 400;
        throw err;
      }
      if (line.lot.mode === 'new') {
        const existing = await this.productLotRepository.findByLotNumber(line.lot.lot_number, organizationId);
        if (existing) {
          const err = new Error(`Lot number already exists: ${line.lot.lot_number}`);
          err.status = 409;
          throw err;
        }
      } else if (line.lot.mode === 'existing') {
        const lot = await this.productLotRepository.findById(line.lot.lot_id, organizationId);
        if (!lot || lot.product_type_id !== detail.product_type_id) {
          const err = new Error('Lot not found, wrong organization, or product type mismatch');
          err.status = 404;
          throw err;
        }
      } else {
        const err = new Error(`Invalid lot.mode: ${line.lot?.mode}`);
        err.status = 400;
        throw err;
      }
    }
  }

  // 6. Execute writes with compensating rollback
  const insertedLotIds = [];
  const insertedMovementIds = [];

  try {
    for (const line of lines) {
      const detail = detailMap[line.detail_id];
      let lotId = detail.lot_id;

      // Create lot if needed
      if (!lotId) {
        if (line.lot.mode === 'new') {
          const newLot = await this.productLotRepository.create({
            lot_number: line.lot.lot_number,
            product_type_id: detail.product_type_id,
            expiration_date: line.lot.expiration_date,
            origin_country: line.lot.origin_country,
            price: line.lot.price,
            organization_id: organizationId,
          }, organizationId);
          lotId = newLot.lot_id;
          insertedLotIds.push(lotId);
        } else {
          lotId = line.lot.lot_id;
        }
      }

      // Create stock movement
      const movement = await this.stockMovementRepository.create({
        lot_id: lotId,
        warehouse_id: po.warehouse_id,
        organization_id: organizationId,
        movement_type: 'entry',
        quantity: line.received_quantity,
        reference: po.purchase_order_number || `PO-${po.purchase_order_id.slice(0, 8).toUpperCase()}`,
        reference_type: 'purchase_order',
        reference_id: po.purchase_order_id,
        notes: `Received from purchase order ${po.purchase_order_number || po.purchase_order_id}`,
      });
      insertedMovementIds.push(movement.movement_id || movement.stock_movement_id);

      // Update detail
      const newReceivedQty = (detail.received_quantity || 0) + line.received_quantity;
      await this.purchaseOrderDetailRepository.updateReceivedQuantityAndLot(
        line.detail_id,
        newReceivedQty,
        lotId,
        organizationId
      );
    }

    // 7. Derive new status from full detail set
    const updatedDetails = await this.purchaseOrderDetailRepository.findByPurchaseOrderId(purchaseOrderId, organizationId);
    const allComplete = updatedDetails.every(d => d.received_quantity >= d.quantity);
    const newStatus = allComplete ? 'received' : 'partially_received';
    const receivedDate = allComplete ? new Date().toISOString() : null;

    await this.purchaseOrderRepository.updateStatus(purchaseOrderId, newStatus, organizationId, receivedDate);

    this.logger.info('Purchase order reception completed', { purchaseOrderId, newStatus });
    return await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);

  } catch (err) {
    // Compensating rollback in reverse order
    for (const movId of [...insertedMovementIds].reverse()) {
      try {
        await this.stockMovementRepository.delete(movId);
      } catch (cErr) {
        this.logger.error('Compensation failed: could not delete stock movement', { movId, error: cErr.message });
      }
    }
    for (const lotId of [...insertedLotIds].reverse()) {
      try {
        await this.productLotRepository.delete(lotId, organizationId);
      } catch (cErr) {
        this.logger.error('Compensation failed: could not delete lot', { lotId, error: cErr.message });
      }
    }
    throw err;
  }
}
```

- [ ] **Step 3: Check for existing tests that set status to `received` via PATCH, then update them**

```bash
grep -rn "'received'\|\"received\"" /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots/backend/tests/ | grep -v ".unit.test.js" | head -20
```

Any test that sends `{ status: 'received' }` to `PATCH /status` must be updated — either removed or changed to use the new `POST /:id/receive` endpoint. Leaving them will cause unexpected test failures.

- [ ] **Step 4: Deprecate `handlePurchaseOrderReceived` in `updatePurchaseOrderStatus`**

Find `handlePurchaseOrderReceived` call inside `updatePurchaseOrderStatus` and remove it:

```js
// Before:
if (newStatus === 'received') {
  await this.handlePurchaseOrderReceived(purchaseOrder, organizationId);
}

// After: (remove the block entirely — status 'received' is now only reachable via receivePurchaseOrder)
// NOTE: handlePurchaseOrderReceived method itself is kept but no longer called
```

Also update `validateStatusTransition` to remove `'received'` from the allowed transitions from `'approved'` and `'partially_received'`, since setting status directly to `'received'` is now blocked:

```js
// Before:
'approved': ['received', 'partially_received', 'cancelled'],
'partially_received': ['received', 'cancelled'],

// After:
'approved': ['partially_received', 'cancelled'],
'partially_received': ['cancelled'],
```

> **Why:** The status `received` is now exclusively set by `receivePurchaseOrder`. The PATCH `/status` endpoint can no longer set it directly.

- [ ] **Step 5: Run tests — they should now pass**

```bash
bun run test -- --testPathPattern="PurchaseOrderService.unit"
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/services/PurchaseOrderService.js
git commit -m "feat: implement PurchaseOrderService.receivePurchaseOrder with lot assignment"
```

---

## Task 6: Resolve `StockMovementRepository` primary key and add `delete` method

**Context:** The compensating rollback calls `stockMovementRepository.delete(movId)`. The primary key column name must be confirmed before writing the service code in Task 5. Do this task BEFORE Task 5.

**Files:**
- Modify (if needed): `backend/repositories/StockMovementRepository.js`

- [ ] **Step 1: Determine primary key column name**

```bash
grep -n "stock_movement_id\|movement_id" /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots/backend/repositories/StockMovementRepository.js | head -10
```

Note the column name. Use it in all subsequent code.

- [ ] **Step 2: Check what field name the `create` method returns**

```bash
grep -n "return\|select\|single" /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots/backend/repositories/StockMovementRepository.js | head -20
```

Note: in Task 5, `insertedMovementIds.push(movement.THE_PK_FIELD)` must use this exact field name — no `||` fallback.

- [ ] **Step 3: Search for existing delete method**

```bash
grep -n "async delete\|\.delete(" /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots/backend/repositories/StockMovementRepository.js | head -10
```

- [ ] **Step 4: If `delete` method is missing, add it**

Add to the class (substitute `THE_PK_FIELD` with the actual column name found in Step 1):
```js
/**
 * Delete a stock movement by ID (used for compensating rollback only)
 * @param {string} movementId
 */
async delete(movementId) {
  const { error } = await this.client
    .from('stock_movements')
    .delete()
    .eq('THE_PK_FIELD', movementId);

  if (error) throw new Error(`Error deleting stock movement: ${error.message}`);
}
```

- [ ] **Step 5: In Task 5's service code, replace the ambiguous push line**

After `const movement = await this.stockMovementRepository.create(...)`, use the confirmed field name:
```js
insertedMovementIds.push(movement.THE_PK_FIELD); // replace with actual PK field name
```

- [ ] **Step 6: Commit (only if modified)**

```bash
git add backend/repositories/StockMovementRepository.js
git commit -m "feat: add delete method to StockMovementRepository for compensating rollback"
```

---

## Task 7: Update DI container + add controller handler + add route

**Files:**
- Modify: `backend/config/container.js`
- Modify: `backend/controllers/PurchaseOrderController.js`
- Modify: `backend/routes/purchase-orders.js`

- [ ] **Step 1: Update container to inject `productLotRepository` into `purchaseOrderService`**

Find the `purchaseOrderService` registration in `container.js` (around line 389) and add `productLotRepository`:

```js
// Before:
container.register('purchaseOrderService', () => {
  return new PurchaseOrderService(
    container.get('purchaseOrderRepository'),
    container.get('purchaseOrderDetailRepository'),
    container.get('supplierRepository'),
    container.get('productTypeRepository'),
    container.get('warehouseRepository'),
    container.get('stockMovementRepository'),
    container.get('logger')
  );
}, true);

// After:
container.register('purchaseOrderService', () => {
  return new PurchaseOrderService(
    container.get('purchaseOrderRepository'),
    container.get('purchaseOrderDetailRepository'),
    container.get('supplierRepository'),
    container.get('productTypeRepository'),
    container.get('warehouseRepository'),
    container.get('stockMovementRepository'),
    container.get('logger'),
    container.get('productLotRepository')   // ← new 8th arg
  );
}, true);
```

- [ ] **Step 2: Add `receivePurchaseOrder` handler to `PurchaseOrderController`**

Add after `updatePurchaseOrderStatus`:

```js
/**
 * Receive a purchase order with lot assignment per line
 * POST /api/purchase-orders/:id/receive
 */
async receivePurchaseOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { lines } = req.body;
    const organizationId = req.user.currentOrganizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'No organization context found.' });
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines array is required and must not be empty' });
    }

    const updatedPO = await this.purchaseOrderService.receivePurchaseOrder(id, lines, organizationId);

    res.json({
      data: updatedPO,
      message: `Purchase order ${updatedPO.status === 'received' ? 'fully received' : 'partially received'}. Stock updated.`,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}
```

- [ ] **Step 3: Add `POST /:id/receive` route**

> **Note on permissions:** The codebase does not have a `PURCHASE_ORDERS_UPDATE` constant in `PERMISSIONS`. Check `backend/middleware/permissions.js` for available constants. Use whichever purchase-orders or products permission already guards the `PATCH /:id/status` route in this file — they use the same access level. At the time of writing this is `PERMISSIONS.PRODUCTS_UPDATE`.

In `backend/routes/purchase-orders.js`, add before the `GET /:id/pdf` route:

```js
/**
 * POST /api/purchase-orders/:id/receive
 * Receive purchase order with lot assignment per line
 */
router.post(
  '/:id/receive',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),  // same permission as PATCH /:id/status
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.receivePurchaseOrder(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);
```

- [ ] **Step 4: Start backend and do a smoke test**

```bash
bun run back
```

In another terminal:
```bash
curl -s -X POST http://localhost:4000/api/purchase-orders/fake-id/receive \
  -H "Content-Type: application/json" \
  -d '{"lines":[]}' | head -5
```
Expected: 401 (auth required) — route exists and is mounted.

- [ ] **Step 5: Commit**

```bash
git add backend/config/container.js backend/controllers/PurchaseOrderController.js backend/routes/purchase-orders.js
git commit -m "feat: add receivePurchaseOrder endpoint (controller + route + container)"
```

---

## Task 8: Frontend types

**Files:**
- Modify: `frontend/src/types/purchaseOrders.ts`

- [ ] **Step 1: Add new types and update `PurchaseOrderDetail`**

Add at the bottom of the types file (before the closing):

```ts
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
```

Update `PurchaseOrderDetail` to add `lot_id` and `product_lot`:

```ts
// In the existing PurchaseOrderDetail interface, add:
lot_id?: string | null;
product_lot?: {
  lot_id: string;
  lot_number: string;
  expiration_date: string;
  origin_country: string;
  price: number;
} | null;
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/.worktrees/feature/product-types-lots/frontend
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no new TS errors from this change.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/purchaseOrders.ts
git commit -m "feat: add ReceiptLine and ReceivePurchaseOrderPayload types; add lot_id to PurchaseOrderDetail"
```

---

## Task 9: Frontend service + hook

**Files:**
- Modify: `frontend/src/services/api/purchaseOrdersService.ts`
- Modify: `frontend/src/hooks/usePurchaseOrders.ts`

- [ ] **Step 1: Add `receive` method to service**

Add after `markAsReceived`:

```ts
/**
 * Receive a purchase order with lot assignment per line
 * @param id - Purchase Order ID
 * @param lines - Array of ReceiptLine
 * @returns Promise<PurchaseOrder>
 */
async receive(id: string, lines: ReceiptLine[]): Promise<PurchaseOrder> {
  try {
    const response = await httpClient.post<{ data: PurchaseOrder }>(
      `/api/purchase-orders/${id}/receive`,
      { lines }
    );
    return response.data || response;
  } catch (error) {
    console.error(`Error receiving purchase order ${id}:`, error);
    throw error;
  }
},
```

Also add `ReceiptLine` to the import at the top of the file:
```ts
import {
  // ... existing imports ...
  ReceiptLine,
} from '../../types/purchaseOrders';
```

- [ ] **Step 2: Update `useReceivePurchaseOrder` hook**

Replace the current `useReceivePurchaseOrder` function entirely:

```ts
/**
 * Hook to receive a purchase order with lot assignment per line.
 * Replaces the old simple status-change approach.
 */
export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lines }: ReceivePurchaseOrderPayload) =>
      purchaseOrdersService.receive(id, lines),
    onSuccess: (receivedPO) => {
      // NOTE: the purchase orders query key in this codebase is camelCase 'purchaseOrders'
      // (confirmed in usePurchaseOrders.ts line 30). Use exactly this casing.
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });

      const msg = receivedPO.status === 'received'
        ? `OC "${receivedPO.purchase_order_number}" recibida completamente. Stock actualizado.`
        : `OC "${receivedPO.purchase_order_number}" parcialmente recibida. Stock actualizado.`;
      toast.success(msg);
    },
    onError: (error: any) => {
      console.error('Error receiving purchase order:', error);
      toast.error(translateApiError(error, 'Error al recibir la orden de compra. Intenta de nuevo.'));
    },
  });
}
```

Add `ReceivePurchaseOrderPayload` to the import from `@/types/purchaseOrders` in the hook file.

- [ ] **Step 3: TypeScript check**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no new TS errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api/purchaseOrdersService.ts frontend/src/hooks/usePurchaseOrders.ts
git commit -m "feat: add purchaseOrdersService.receive and update useReceivePurchaseOrder hook"
```

---

## Task 10: `ReceiptLineRow` component

**Context:** One row in the reception modal. Shows product name, ordered/remaining qty, quantity input, and lot assignment UI. This is an internal component — only used inside `ReceivePurchaseOrderModal`.

> **Pre-check: `useProductLots` signature** — The hook is at `frontend/src/hooks/useProductLots.ts`. It accepts `typeId: string | undefined` and has `enabled: !!typeId`, so passing `undefined` safely disables the query. The component passes `undefined` when in `new` lot mode, which is correct.

**Files:**
- Create: `frontend/src/components/features/purchase-orders/ReceiptLineRow.tsx`

- [ ] **Step 1: Create `ReceiptLineRow.tsx`**

```tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProductLots } from '@/hooks/useProductLots';
import { ReceiptLine, PurchaseOrderDetail } from '@/types/purchaseOrders';

interface ReceiptLineRowProps {
  detail: PurchaseOrderDetail;
  value: Partial<ReceiptLine>;
  onChange: (value: Partial<ReceiptLine>) => void;
}

export function ReceiptLineRow({ detail, value, onChange }: ReceiptLineRowProps) {
  const remaining = detail.quantity - (detail.received_quantity || 0);
  const productName = detail.product_types?.name ?? detail.product_type_id;
  const hasExistingLot = !!detail.lot_id;

  // Only fetch lots when using "existing" mode
  const lotsEnabled = !hasExistingLot && value.lot?.mode === 'existing';
  const { data: existingLots = [] } = useProductLots(
    lotsEnabled ? detail.product_type_id : undefined
  );

  const handleQtyChange = (qty: number) => {
    onChange({ ...value, received_quantity: qty });
  };

  const handleModeChange = (mode: 'new' | 'existing') => {
    if (mode === 'new') {
      onChange({
        ...value,
        lot: {
          mode: 'new',
          lot_number: '',
          expiration_date: '',
          origin_country: '',
          price: detail.unit_price,
        },
      });
    } else {
      onChange({ ...value, lot: { mode: 'existing', lot_id: '' } });
    }
  };

  const qty = value.received_quantity ?? remaining;
  const isZero = qty === 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{productName}</p>
          {detail.product_types?.sku && (
            <p className="text-xs text-muted-foreground">SKU: {detail.product_types.sku}</p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Pedido: {detail.quantity}</p>
          <p>Ya recibido: {detail.received_quantity || 0}</p>
          <p className="font-medium text-foreground">Pendiente: {remaining}</p>
        </div>
      </div>

      {/* Quantity input */}
      <div>
        <Label className="text-xs">Cantidad a recibir (máx. {remaining})</Label>
        <Input
          type="number"
          min={0}
          max={remaining}
          value={qty}
          onChange={(e) => handleQtyChange(Number(e.target.value))}
          className="mt-1 w-32"
        />
      </div>

      {/* Lot section */}
      <div className={isZero ? 'opacity-40 pointer-events-none' : ''}>
        {hasExistingLot ? (
          /* Line already has a lot from prior partial reception */
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Lote: {detail.product_lot?.lot_number ?? detail.lot_id}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Vence: {detail.product_lot?.expiration_date ?? '—'}
            </span>
          </div>
        ) : (
          /* Need to assign a lot */
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-4">
              {(['new', 'existing'] as const).map((m) => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name={`lot-mode-${detail.detail_id}`}
                    value={m}
                    checked={value.lot?.mode === m}
                    onChange={() => handleModeChange(m)}
                    className="accent-primary"
                  />
                  {m === 'new' ? 'Lote nuevo' : 'Lote existente'}
                </label>
              ))}
            </div>

            {value.lot?.mode === 'new' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Número de lote *</Label>
                  <Input
                    value={(value.lot as any).lot_number}
                    onChange={(e) =>
                      onChange({ ...value, lot: { ...(value.lot as any), lot_number: e.target.value } })
                    }
                    placeholder="LOTE-2026-001"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vencimiento *</Label>
                  <Input
                    type="date"
                    value={(value.lot as any).expiration_date}
                    onChange={(e) =>
                      onChange({ ...value, lot: { ...(value.lot as any), expiration_date: e.target.value } })
                    }
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">País de origen</Label>
                  <Input
                    value={(value.lot as any).origin_country}
                    onChange={(e) =>
                      onChange({ ...value, lot: { ...(value.lot as any), origin_country: e.target.value } })
                    }
                    placeholder="AR"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Precio / unidad</Label>
                  <Input
                    type="number"
                    value={(value.lot as any).price}
                    onChange={(e) =>
                      onChange({ ...value, lot: { ...(value.lot as any), price: Number(e.target.value) } })
                    }
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {value.lot?.mode === 'existing' && (
              <div>
                <Label className="text-xs">Seleccionar lote *</Label>
                <Select
                  value={(value.lot as any).lot_id}
                  onValueChange={(lot_id) =>
                    onChange({ ...value, lot: { mode: 'existing', lot_id } })
                  }
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Elegir lote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingLots.map((lot: any) => (
                      <SelectItem key={lot.lot_id} value={lot.lot_id}>
                        {lot.lot_number} — vence {lot.expiration_date ?? '—'}
                      </SelectItem>
                    ))}
                    {existingLots.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">Sin lotes disponibles</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/purchase-orders/ReceiptLineRow.tsx
git commit -m "feat: add ReceiptLineRow component for lot assignment per PO line"
```

---

## Task 11: `ReceivePurchaseOrderModal` component

**Files:**
- Create: `frontend/src/components/features/purchase-orders/ReceivePurchaseOrderModal.tsx`

- [ ] **Step 1: Create `ReceivePurchaseOrderModal.tsx`**

```tsx
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@/components/ui/modal';
import { PurchaseOrder, ReceiptLine } from '@/types/purchaseOrders';
import { ReceiptLineRow } from './ReceiptLineRow';
import { useReceivePurchaseOrder } from '@/hooks/usePurchaseOrders';

interface ReceivePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
}

export function ReceivePurchaseOrderModal({
  isOpen,
  onClose,
  purchaseOrder,
}: ReceivePurchaseOrderModalProps) {
  const receiveMutation = useReceivePurchaseOrder();

  // Only show lines that are not yet fully received
  const pendingDetails = useMemo(
    () => (purchaseOrder.purchase_order_details ?? []).filter(
      (d) => d.received_quantity < d.quantity
    ),
    [purchaseOrder.purchase_order_details]
  );

  // Local state: map of detail_id → partial ReceiptLine
  const [lineState, setLineState] = useState<Record<string, Partial<ReceiptLine>>>(() =>
    Object.fromEntries(
      pendingDetails.map((d) => [
        d.detail_id,
        {
          detail_id: d.detail_id,
          received_quantity: d.quantity - (d.received_quantity || 0),
          // If lot already assigned, no lot field needed
          lot: d.lot_id
            ? undefined
            : { mode: 'new', lot_number: '', expiration_date: '', origin_country: '', price: d.unit_price },
        },
      ])
    )
  );

  const hasAtLeastOneLine = Object.values(lineState).some(
    (l) => (l.received_quantity ?? 0) > 0
  );

  const isValid = useMemo(() => {
    if (!hasAtLeastOneLine) return false;
    return Object.entries(lineState).every(([detailId, line]) => {
      if ((line.received_quantity ?? 0) === 0) return true; // zero lines are skipped
      const detail = pendingDetails.find((d) => d.detail_id === detailId);
      if (!detail) return false;
      if (detail.lot_id) return true; // existing lot, no validation needed
      if (!line.lot) return false;
      if (line.lot.mode === 'new') {
        const l = line.lot as any;
        return !!l.lot_number && !!l.expiration_date;
      }
      if (line.lot.mode === 'existing') {
        return !!(line.lot as any).lot_id;
      }
      return false;
    });
  }, [lineState, pendingDetails, hasAtLeastOneLine]);

  const handleConfirm = async () => {
    // Build payload — exclude zero-qty lines
    const lines: ReceiptLine[] = Object.values(lineState)
      .filter((l) => (l.received_quantity ?? 0) > 0)
      .map((l) => ({
        detail_id: l.detail_id!,
        received_quantity: l.received_quantity!,
        lot: l.lot as ReceiptLine['lot'],
      }));

    try {
      await receiveMutation.mutateAsync({ id: purchaseOrder.purchase_order_id, lines });
      onClose();
    } catch {
      // Error toast handled by hook
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>
            Recibir OC #{purchaseOrder.purchase_order_number}
          </ModalTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Almacén destino: <strong>{purchaseOrder.warehouse?.name ?? '—'}</strong>
          </p>
        </ModalHeader>

        <div className="px-6 py-4 space-y-3">
          {pendingDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Todos los productos ya fueron recibidos completamente.
            </p>
          ) : (
            pendingDetails.map((detail) => (
              <ReceiptLineRow
                key={detail.detail_id}
                detail={detail}
                value={lineState[detail.detail_id] ?? {}}
                onChange={(updated) =>
                  setLineState((prev) => ({ ...prev, [detail.detail_id]: updated }))
                }
              />
            ))
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={receiveMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || receiveMutation.isPending || pendingDetails.length === 0}
          >
            {receiveMutation.isPending ? 'Procesando...' : 'Confirmar recepción'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Fix any errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/purchase-orders/ReceivePurchaseOrderModal.tsx
git commit -m "feat: add ReceivePurchaseOrderModal with per-line lot assignment"
```

---

## Task 12: Wire `ReceivePurchaseOrderModal` into `PurchaseOrdersPage`

**Files:**
- Modify: `frontend/src/components/features/purchase-orders/PurchaseOrdersPage.tsx`

- [ ] **Step 1: Add modal state and import**

Add to the imports at the top:
```tsx
import { ReceivePurchaseOrderModal } from './ReceivePurchaseOrderModal';
import { toast } from '@/lib/toast';
```

Add modal state alongside existing state:
```tsx
const [receiveModalState, setReceiveModalState] = useState<{
  isOpen: boolean;
  purchaseOrder?: PurchaseOrder;
}>({ isOpen: false });
```

- [ ] **Step 2: Update the `receive` bulk action to open the modal**

Find the `bulkActions` array. Replace the `receive` action's `onClick`:

```tsx
// Before:
{
  key: 'receive',
  // ...
  onClick: (orders) =>
    setBatchActionModalState({ isOpen: true, action: 'receive', purchaseOrders: orders }),
  getValidItems: (orders) => orders.filter((o) => o.status === 'approved'),
},

// After:
{
  key: 'receive',
  label: t('purchaseOrders.actions.receive'),
  icon: Truck,
  colorScheme: {
    bg: 'bg-white',
    border: 'border-purple-300',
    text: 'text-purple-700',
    hoverBg: 'hover:bg-purple-50',
  },
  onClick: (orders) => {
    if (orders.length > 1) {
      toast.info('Solo se puede recibir una OC a la vez. Procesando la primera seleccionada.');
    }
    setReceiveModalState({ isOpen: true, purchaseOrder: orders[0] });
  },
  getValidItems: (orders) =>
    orders.filter((o) => o.status === 'approved' || o.status === 'partially_received'),
},
```

- [ ] **Step 3: Remove `receive` from `batchActionModalState` confirm handler**

Find `confirmBatchAction` and remove the `case 'receive':` branch (it will never be called now):

```tsx
// Remove:
case 'receive':
  return receiveMutation.mutateAsync(order.purchase_order_id);
```

Also remove `receiveMutation` from the mutation hook declarations (it's no longer used in this context):
```tsx
// Remove this line:
const receiveMutation = useReceivePurchaseOrder();
```

- [ ] **Step 4: Add the modal to the JSX**

At the bottom of the returned JSX, after the existing modals:

```tsx
{/* Receive PO Modal */}
{/* key={purchase_order_id} forces a remount when a different PO is opened,
    preventing stale useState from a previous PO being shown */}
{receiveModalState.isOpen && receiveModalState.purchaseOrder && (
  <ReceivePurchaseOrderModal
    key={receiveModalState.purchaseOrder.purchase_order_id}
    isOpen={receiveModalState.isOpen}
    onClose={() => setReceiveModalState({ isOpen: false })}
    purchaseOrder={receiveModalState.purchaseOrder}
  />
)}
```

- [ ] **Step 5: TypeScript check + lint**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
bun run lint 2>&1 | grep -E "error|warning" | head -20
```

Fix any issues.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/features/purchase-orders/PurchaseOrdersPage.tsx
git commit -m "feat: wire ReceivePurchaseOrderModal into PurchaseOrdersPage bulk action"
```

---

## Task 13: Manual end-to-end verification

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant
bun run back

# Terminal 2
bun run front
```

- [ ] **Step 2: Navigate to Purchase Orders page in browser**

Open `http://localhost:3000`, log in, navigate to Purchase Orders.

- [ ] **Step 3: Test full reception flow (happy path)**

1. Find or create a PO in `approved` status.
2. Select it in the table. Click bulk action "Receive".
3. Verify `ReceivePurchaseOrderModal` opens with all pending lines.
4. For one line: select "Lote nuevo", fill in lot number, expiration date (a future date), country, price.
5. For another line (if multiple): select "Lote existente" and pick from dropdown.
6. Click "Confirmar recepción".
7. Verify success toast appears.
8. Verify PO status changes to `received` or `partially_received` in the table.
9. Navigate to Products and verify the new lot appears under the correct product type.

- [ ] **Step 4: Test partial reception**

1. Find or create a PO with multiple lines, each with quantity ≥ 2.
2. Receive it with quantity < total for at least one line.
3. Verify PO status = `partially_received`.
4. Click "Receive" again on the same PO.
5. Verify the modal shows only the remaining quantities.
6. Verify previously assigned lots appear as read-only badges.
7. Complete the remaining reception.
8. Verify PO status = `received`.

- [ ] **Step 5: Test validation errors**

1. Try receiving with quantity 0 on all lines — "Confirmar" button should be disabled.
2. Try receiving with an empty lot number on "Lote nuevo" mode — button disabled.
3. Select "Lote existente" without picking a lot — button disabled.

- [ ] **Step 6: Commit any polish fixes found during testing**

```bash
git add -p  # stage only the fixes
git commit -m "fix: address issues found during manual e2e verification of PO reception"
```

---

## Summary

| # | What | Files |
|---|---|---|
| 1 | DB migration: `lot_id` column | `015_add_lot_id_to_purchase_order_details.sql` |
| 2 | Fix shared Express router | `productLots.js`, `server.js` |
| 3 | Repository: `updateReceivedQuantityAndLot` | `PurchaseOrderDetailRepository.js` |
| 4 | Failing unit tests | `PurchaseOrderService.unit.test.js` |
| 5 | Service: `receivePurchaseOrder` | `PurchaseOrderService.js` |
| 6 | Repository: `StockMovementRepository.delete` (if missing) | `StockMovementRepository.js` |
| 7 | Container + controller + route | `container.js`, `PurchaseOrderController.js`, `purchase-orders.js` |
| 8 | Frontend types | `purchaseOrders.ts` |
| 9 | Frontend service + hook | `purchaseOrdersService.ts`, `usePurchaseOrders.ts` |
| 10 | `ReceiptLineRow` component | new file |
| 11 | `ReceivePurchaseOrderModal` component | new file |
| 12 | Wire into page | `PurchaseOrdersPage.tsx` |
| 13 | Manual e2e verification | — |
