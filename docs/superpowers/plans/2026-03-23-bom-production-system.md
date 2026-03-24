# BOM / Production System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Bill of Materials (BOM) system that allows organizations to define product formulas and register atomic production movements that consume raw materials and credit finished goods.

**Architecture:** New `product_formulas` table stores BOM recipes. A Supabase RPC (`create_production_movement`) handles the atomic multi-row stock movement. Backend follows the existing Clean Architecture: Repository → Service → Controller → Routes, all registered in the DI container. Frontend adds a `ProductFormulaEditor` embedded in the product form and a `ProductionMovementForm` that shows a real-time stock preview.

**Tech Stack:** Node.js + Express + Supabase (PostgreSQL RPC for atomicity), React 18 + TanStack Query, Joi validation, TypeScript.

---

## File Map

### Backend — Create
- `backend/repositories/ProductFormulaRepository.js` — data access for `product_formulas`
- `backend/services/ProductFormulaService.js` — BOM CRUD + stock validation
- `backend/controllers/ProductFormulaController.js` — HTTP handlers for formula CRUD
- `backend/routes/productFormulas.js` — Express router for `/api/product-formulas`
- `backend/validations/productFormulaValidation.js` — Joi schemas

### Backend — Modify
- `backend/services/StockMovementService.js` — add `createProductionMovement()`
- `backend/validations/stockMovementValidation.js` — add `'production'` to valid types
- `backend/config/container.js` — register new repo/service/controller
- `backend/server.js` — mount `/api/product-formulas` route

### Frontend — Create
- `frontend/src/types/productFormula.ts` — TypeScript interfaces
- `frontend/src/services/api/productFormulaService.ts` — API client
- `frontend/src/hooks/useProductFormula.ts` — React Query hooks
- `frontend/src/components/features/products/ProductFormulaEditor.tsx` — BOM editor component
- `frontend/src/components/features/stock-movements/ProductionMovementForm.tsx` — production form with preview

### Frontend — Modify
- `frontend/src/pages/Dashboard/Products.tsx` — add `product_type` field + `ProductFormulaEditor`
- `frontend/src/pages/Dashboard/StockMovements.tsx` — add `production` type + `ProductionMovementForm`

---

## Task 1: Database Migration — `product_type` column on `products`

**Files:**
- Create: `backend/migrations/add_product_type_and_formulas.sql`

- [ ] **Step 1.1: Write migration SQL**

Create `backend/migrations/add_product_type_and_formulas.sql` with:

```sql
-- 1. Add product_type to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) NOT NULL DEFAULT 'standard'
  CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'raw_material', 'finished_good'));

-- 2. Create product_formulas table
CREATE TABLE IF NOT EXISTS product_formulas (
  formula_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id  UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  raw_material_id      UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity_required    NUMERIC(10,4) NOT NULL CHECK (quantity_required > 0),
  organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(finished_product_id, raw_material_id)
);

-- 3. RLS
ALTER TABLE product_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_isolation" ON product_formulas
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- 4. Update stock_movements movement_type check to include 'production'
-- (Check if constraint exists before dropping)
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'compliance', 'production'));
```

- [ ] **Step 1.2: Create Supabase RPC**

Execute in Supabase SQL editor (or add to migration file):

```sql
CREATE OR REPLACE FUNCTION create_production_movement(
  p_finished_product_id UUID,
  p_quantity_to_produce  NUMERIC,
  p_warehouse_id         UUID,
  p_organization_id      UUID,
  p_user_reference       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_formula        RECORD;
  v_current_stock  NUMERIC;
  v_movement_date  TIMESTAMPTZ := now();
  v_reference      TEXT;
  v_movements      JSONB := '[]'::JSONB;
  v_entry_movement JSONB;
BEGIN
  -- Generate reference
  v_reference := COALESCE(p_user_reference, 'PROD-' || to_char(v_movement_date, 'YYYYMMDD-HH24MISS'));

  -- 1. Verify formula exists and product belongs to organization
  IF NOT EXISTS (
    SELECT 1 FROM product_formulas
    WHERE finished_product_id = p_finished_product_id
      AND organization_id = p_organization_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No formula found for product % in organization %', p_finished_product_id, p_organization_id;
  END IF;

  -- 2. For each raw material: verify sufficient stock and debit
  FOR v_formula IN
    SELECT pf.formula_id, pf.raw_material_id, pf.quantity_required,
           p.name AS raw_material_name
    FROM product_formulas pf
    JOIN products p ON p.product_id = pf.raw_material_id
    WHERE pf.finished_product_id = p_finished_product_id
      AND pf.organization_id = p_organization_id
  LOOP
    -- Calculate required quantity
    DECLARE
      v_required NUMERIC := v_formula.quantity_required * p_quantity_to_produce;
    BEGIN
      -- Check current stock in warehouse
      SELECT COALESCE(SUM(
        CASE
          WHEN movement_type IN ('entry') THEN quantity
          WHEN movement_type IN ('exit', 'production') THEN -quantity
          ELSE 0
        END
      ), 0)
      INTO v_current_stock
      FROM stock_movements
      WHERE product_id = v_formula.raw_material_id
        AND warehouse_id = p_warehouse_id
        AND organization_id = p_organization_id;

      IF v_current_stock < v_required THEN
        RAISE EXCEPTION 'Insufficient stock for "%": required %, available %',
          v_formula.raw_material_name, v_required, v_current_stock;
      END IF;

      -- Insert exit movement for raw material
      INSERT INTO stock_movements (
        product_id, warehouse_id, organization_id,
        movement_type, quantity, movement_date, reference, notes
      ) VALUES (
        v_formula.raw_material_id, p_warehouse_id, p_organization_id,
        'production', v_required, v_movement_date, v_reference,
        'Production consumption: ' || v_reference
      );

      v_movements := v_movements || jsonb_build_object(
        'product_id', v_formula.raw_material_id,
        'name', v_formula.raw_material_name,
        'quantity_consumed', v_required
      );
    END;
  END LOOP;

  -- 3. Insert entry movement for finished product
  INSERT INTO stock_movements (
    product_id, warehouse_id, organization_id,
    movement_type, quantity, movement_date, reference, notes
  ) VALUES (
    p_finished_product_id, p_warehouse_id, p_organization_id,
    'entry', p_quantity_to_produce, v_movement_date, v_reference,
    'Production output: ' || v_reference
  );

  RETURN jsonb_build_object(
    'reference', v_reference,
    'finished_product_id', p_finished_product_id,
    'quantity_produced', p_quantity_to_produce,
    'materials_consumed', v_movements
  );
END;
$$;
```

- [ ] **Step 1.3: Run migration in Supabase**

Go to Supabase Dashboard → SQL Editor → run the migration SQL.
Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_type';`
Expected: returns 1 row.

- [ ] **Step 1.4: Commit**

```bash
git add backend/migrations/add_product_type_and_formulas.sql
git commit -m "feat: add product_type column, product_formulas table, and production RPC"
```

---

## Task 2: Backend — ProductFormulaRepository

**Files:**
- Create: `backend/repositories/ProductFormulaRepository.js`

- [ ] **Step 2.1: Write repository**

```javascript
// backend/repositories/ProductFormulaRepository.js
const { BaseRepository } = require('./BaseRepository');

class ProductFormulaRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_formulas');
  }

  /**
   * Find all formula items for a finished product within an organization,
   * joining raw material name and unit for display.
   */
  async findByFinishedProduct(finishedProductId, organizationId) {
    if (!organizationId) {
      throw new Error('organizationId is required');
    }
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select(`
          formula_id,
          finished_product_id,
          raw_material_id,
          quantity_required,
          organization_id,
          created_at,
          raw_material:products!product_formulas_raw_material_id_fkey(
            product_id, name, unit
          )
        `)
        .eq('finished_product_id', finishedProductId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding formula: ${error?.message || String(error)}`);
    }
  }

  /**
   * Check for cycles: returns true if adding (finishedProductId → rawMaterialId)
   * would create a direct cycle (A → B and B → A).
   * Simple cycle check (not full DAG traversal — sufficient for practical use).
   */
  async wouldCreateCycle(finishedProductId, rawMaterialId, organizationId) {
    const { data } = await this.client
      .from(this.table)
      .select('formula_id')
      .eq('finished_product_id', rawMaterialId)
      .eq('raw_material_id', finishedProductId)
      .eq('organization_id', organizationId)
      .limit(1);
    return (data || []).length > 0;
  }
}

module.exports = { ProductFormulaRepository };
```

- [ ] **Step 2.2: Verify file exists**

```bash
ls backend/repositories/ProductFormulaRepository.js
```
Expected: file listed.

- [ ] **Step 2.3: Commit**

```bash
git add backend/repositories/ProductFormulaRepository.js
git commit -m "feat: add ProductFormulaRepository"
```

---

## Task 3: Backend — ProductFormulaService

**Files:**
- Create: `backend/services/ProductFormulaService.js`

- [ ] **Step 3.1: Write service**

```javascript
// backend/services/ProductFormulaService.js
const { Logger } = require('../utils/Logger');

class ProductFormulaService {
  constructor(productFormulaRepository, productRepository, warehouseRepository, supabaseClient, logger) {
    this.formulaRepository = productFormulaRepository;
    this.productRepository = productRepository;
    this.warehouseRepository = warehouseRepository;
    this.supabaseClient = supabaseClient; // for RPC calls
    this.logger = logger || new Logger('ProductFormulaService');
  }

  /**
   * Get full formula (BOM) for a finished product.
   */
  async getFormula(finishedProductId, organizationId) {
    try {
      await this._validateFinishedProduct(finishedProductId, organizationId);
      return await this.formulaRepository.findByFinishedProduct(finishedProductId, organizationId);
    } catch (error) {
      this.logger.error(`Error getting formula: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add one component to a formula (or update quantity if it already exists via upsert).
   */
  async addFormulaItem(data, organizationId) {
    const { finished_product_id, raw_material_id, quantity_required } = data;

    if (!finished_product_id || !raw_material_id || !quantity_required) {
      throw new Error('finished_product_id, raw_material_id, and quantity_required are required');
    }
    if (quantity_required <= 0) {
      throw new Error('quantity_required must be greater than 0');
    }
    if (finished_product_id === raw_material_id) {
      throw new Error('A product cannot be its own raw material');
    }

    try {
      // Validate both products belong to this org
      await this._validateFinishedProduct(finished_product_id, organizationId);
      await this._validateRawMaterial(raw_material_id, organizationId);

      // Check for cycles
      const hasCycle = await this.formulaRepository.wouldCreateCycle(
        finished_product_id, raw_material_id, organizationId
      );
      if (hasCycle) {
        throw new Error('Adding this component would create a cycle in the formula');
      }

      return await this.formulaRepository.create({
        finished_product_id,
        raw_material_id,
        quantity_required,
        organization_id: organizationId,
      });
    } catch (error) {
      this.logger.error(`Error adding formula item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update quantity_required of a formula item.
   */
  async updateFormulaItem(formulaId, quantity_required, organizationId) {
    if (!quantity_required || quantity_required <= 0) {
      throw new Error('quantity_required must be greater than 0');
    }
    try {
      const item = await this.formulaRepository.findById(formulaId, 'formula_id');
      if (!item) throw new Error('Formula item not found');
      if (item.organization_id !== organizationId) throw new Error('Access denied');

      return await this.formulaRepository.update(formulaId, { quantity_required }, 'formula_id');
    } catch (error) {
      this.logger.error(`Error updating formula item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove one component from a formula.
   */
  async deleteFormulaItem(formulaId, organizationId) {
    try {
      const item = await this.formulaRepository.findById(formulaId, 'formula_id');
      if (!item) throw new Error('Formula item not found');
      if (item.organization_id !== organizationId) throw new Error('Access denied');

      await this.formulaRepository.delete(formulaId, 'formula_id');
      return true;
    } catch (error) {
      this.logger.error(`Error deleting formula item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate whether there is enough stock to produce `quantity` units of the
   * finished product in the given warehouse. Returns a preview object.
   */
  async validateFormulaStock(finishedProductId, quantity, warehouseId, organizationId) {
    try {
      const formula = await this.formulaRepository.findByFinishedProduct(
        finishedProductId, organizationId
      );
      if (formula.length === 0) {
        throw new Error('No formula defined for this product');
      }

      // Get current stock for each raw material in the warehouse
      const materialsCheck = await Promise.all(
        formula.map(async (item) => {
          const required = item.quantity_required * quantity;

          // Stock = sum of entries - sum of exits/production in this warehouse
          const { data: movements } = await this.supabaseClient
            .from('stock_movements')
            .select('movement_type, quantity')
            .eq('product_id', item.raw_material_id)
            .eq('warehouse_id', warehouseId)
            .eq('organization_id', organizationId);

          const currentStock = (movements || []).reduce((acc, m) => {
            if (m.movement_type === 'entry') return acc + Number(m.quantity);
            if (['exit', 'production'].includes(m.movement_type)) return acc - Number(m.quantity);
            return acc;
          }, 0);

          return {
            product_id: item.raw_material_id,
            name: item.raw_material?.name || item.raw_material_id,
            quantity_required: required,
            current_stock: currentStock,
            sufficient: currentStock >= required,
          };
        })
      );

      const canProduce = materialsCheck.every(m => m.sufficient);
      const finishedProduct = await this.productRepository.findById(finishedProductId, organizationId);

      return {
        finished_product: { product_id: finishedProductId, name: finishedProduct?.name },
        quantity_to_produce: quantity,
        materials_to_consume: materialsCheck,
        can_produce: canProduce,
      };
    } catch (error) {
      this.logger.error(`Error validating formula stock: ${error.message}`);
      throw error;
    }
  }

  // --- Private helpers ---

  async _validateFinishedProduct(productId, organizationId) {
    const product = await this.productRepository.findById(productId, organizationId);
    if (!product) throw new Error('Finished product not found');
    if (product.organization_id !== organizationId) throw new Error('Product does not belong to your organization');
    if (product.product_type !== 'finished_good') {
      throw new Error('Product must be of type finished_good to have a formula');
    }
    return product;
  }

  async _validateRawMaterial(productId, organizationId) {
    const product = await this.productRepository.findById(productId, organizationId);
    if (!product) throw new Error('Raw material not found');
    if (product.organization_id !== organizationId) throw new Error('Raw material does not belong to your organization');
    if (product.product_type !== 'raw_material') {
      throw new Error('Component product must be of type raw_material');
    }
    return product;
  }
}

module.exports = { ProductFormulaService };
```

- [ ] **Step 3.2: Commit**

```bash
git add backend/services/ProductFormulaService.js
git commit -m "feat: add ProductFormulaService with BOM CRUD and stock validation"
```

---

## Task 4: Backend — ProductFormulaController + Routes + Validation

**Files:**
- Create: `backend/controllers/ProductFormulaController.js`
- Create: `backend/routes/productFormulas.js`
- Create: `backend/validations/productFormulaValidation.js`

- [ ] **Step 4.1: Write validation schema**

```javascript
// backend/validations/productFormulaValidation.js
const Joi = require('joi');

const addFormulaItemSchema = Joi.object({
  finished_product_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  raw_material_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  quantity_required: Joi.number().positive().precision(4).required(),
});

const updateFormulaItemSchema = Joi.object({
  quantity_required: Joi.number().positive().precision(4).required(),
});

module.exports = { addFormulaItemSchema, updateFormulaItemSchema };
```

- [ ] **Step 4.2: Write controller**

```javascript
// backend/controllers/ProductFormulaController.js
const { Logger } = require('../utils/Logger');

class ProductFormulaController {
  constructor(productFormulaService) {
    this.service = productFormulaService;
    this.logger = new Logger('ProductFormulaController');
  }

  async getFormula(req, res, next) {
    try {
      const { productId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const formula = await this.service.getFormula(productId, orgId);
      res.json({ data: formula });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async addFormulaItem(req, res, next) {
    try {
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const item = await this.service.addFormulaItem(req.body, orgId);
      res.status(201).json({ message: 'Formula item added', data: item });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied') ||
          error.message.includes('must be') || error.message.includes('cycle')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async updateFormulaItem(req, res, next) {
    try {
      const { formulaId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const item = await this.service.updateFormulaItem(
        formulaId, req.body.quantity_required, orgId
      );
      res.json({ message: 'Formula item updated', data: item });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async deleteFormulaItem(req, res, next) {
    try {
      const { formulaId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      await this.service.deleteFormulaItem(formulaId, orgId);
      res.json({ message: 'Formula item deleted' });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async validateStock(req, res, next) {
    try {
      const { productId } = req.params;
      const { quantity, warehouseId } = req.query;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      if (!quantity || !warehouseId) {
        return res.status(400).json({ error: 'quantity and warehouseId are required' });
      }

      const preview = await this.service.validateFormulaStock(
        productId, Number(quantity), warehouseId, orgId
      );
      res.json({ data: preview });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('No formula')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
}

module.exports = { ProductFormulaController };
```

- [ ] **Step 4.3: Write routes**

```javascript
// backend/routes/productFormulas.js
const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { addFormulaItemSchema, updateFormulaItemSchema } = require('../validations/productFormulaValidation');

// Use ServiceFactory directly (same pattern as products.js and other routes)
function createProductFormulaRoutes() {
  const router = express.Router();
  const controller = ServiceFactory.createProductFormulaController();

  router.use(authenticateUser);
  router.use(requireOrganizationContext);

  // GET  /api/product-formulas/:productId
  router.get('/:productId', (req, res, next) => controller.getFormula(req, res, next));

  // GET  /api/product-formulas/:productId/validate?quantity=N&warehouseId=X
  router.get('/:productId/validate', (req, res, next) => controller.validateStock(req, res, next));

  // POST /api/product-formulas
  router.post('/', validateRequest(addFormulaItemSchema), (req, res, next) => controller.addFormulaItem(req, res, next));

  // PUT  /api/product-formulas/:formulaId
  router.put('/:formulaId', validateRequest(updateFormulaItemSchema), (req, res, next) => controller.updateFormulaItem(req, res, next));

  // DELETE /api/product-formulas/:formulaId
  router.delete('/:formulaId', (req, res, next) => controller.deleteFormulaItem(req, res, next));

  return router;
}

module.exports = createProductFormulaRoutes;
```

- [ ] **Step 4.4: Commit**

```bash
git add backend/controllers/ProductFormulaController.js backend/routes/productFormulas.js backend/validations/productFormulaValidation.js
git commit -m "feat: add ProductFormulaController, routes, and validation schemas"
```

---

## Task 5: Backend — Register in DI Container and Mount Route

**Files:**
- Modify: `backend/config/container.js`
- Modify: `backend/server.js`

- [ ] **Step 5.1: Add imports to container.js**

At the top of `backend/config/container.js`, after the existing imports, add:

```javascript
const { ProductFormulaRepository } = require('../repositories/ProductFormulaRepository');
const { ProductFormulaService } = require('../services/ProductFormulaService');
const { ProductFormulaController } = require('../controllers/ProductFormulaController');
```

- [ ] **Step 5.2: Register in initializeContainer()**

Inside `initializeContainer()`, after the `stockMovementRepository` registration (around line 155):

```javascript
  container.register('productFormulaRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductFormulaRepository(dbConfig.getClient());
  }, true);
```

After the `stockMovementService` registration (around line 278):

```javascript
  container.register('productFormulaService', () => {
    const formulaRepository = container.get('productFormulaRepository');
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const dbConfig = container.get('dbConfig');
    const logger = container.get('logger');
    return new ProductFormulaService(
      formulaRepository, productRepository, warehouseRepository,
      dbConfig.getClient(), logger
    );
  }, true);
```

After the `stockMovementController` registration:

```javascript
  container.register('productFormulaController', () => {
    const service = container.get('productFormulaService');
    return new ProductFormulaController(service);
  }, true);
```

- [ ] **Step 5.3: Add to ServiceFactory**

At the bottom of `container.js`, in the `ServiceFactory` object:

```javascript
  createProductFormulaController() {
    return container.get('productFormulaController');
  },
  createProductFormulaService() {
    return container.get('productFormulaService');
  },
```

- [ ] **Step 5.4: Mount route in server.js**

In `backend/server.js`, add import after the existing route imports:

```javascript
const createProductFormulaRoutes = require('./routes/productFormulas');
```

In `setupRoutes()`, after the `stock-movements` line:

```javascript
    this.app.use('/api/product-formulas', createProductFormulaRoutes());
```

- [ ] **Step 5.5: Start server and verify route is accessible**

```bash
cd backend && bun run dev &
sleep 3
curl -s http://localhost:4000/api/product-formulas/test-id 2>&1 | head -5
```
Expected: JSON response (401 Unauthorized is fine — means route is mounted).

- [ ] **Step 5.6: Commit**

```bash
git add backend/config/container.js backend/server.js
git commit -m "feat: register ProductFormula stack in DI container and mount route"
```

---

## Task 6: Backend — Add `createProductionMovement` to StockMovementService

**Files:**
- Modify: `backend/services/StockMovementService.js`
- Modify: `backend/validations/stockMovementValidation.js`

- [ ] **Step 6.1: Add `'production'` to valid types in stockMovementValidation.js**

In `backend/validations/stockMovementValidation.js`, change line:

```javascript
// BEFORE
const VALID_MOVEMENT_TYPES = ['entry', 'exit', 'adjustment', 'compliance'];

// AFTER
const VALID_MOVEMENT_TYPES = ['entry', 'exit', 'adjustment', 'compliance', 'production'];
```

- [ ] **Step 6.2: Update `validateMovementData` in StockMovementService.js**

**Note:** `stockMovementValidation.js` uses `'compliance'` and `StockMovementService.js` uses `'senasa'` — these are currently out of sync. Keep both as-is and only add `'production'` to each.

Find the `validTypes` array in `validateMovementData()` (line ~301):

```javascript
// BEFORE
const validTypes = ['entry', 'exit', 'adjustment', 'senasa'];

// AFTER
const validTypes = ['entry', 'exit', 'adjustment', 'senasa', 'production'];
```

- [ ] **Step 6.3: Add `createProductionMovement()` method**

Add the following method to `StockMovementService` before the closing `}` of the class:

```javascript
  /**
   * Create a production movement via Supabase RPC (atomic).
   * @param {Object} data - { finished_product_id, quantity_to_produce, warehouse_id, reference }
   * @param {string} organizationId
   * @returns {Promise<Object>} RPC result with reference and summary
   */
  async createProductionMovement(data, organizationId) {
    try {
      this.logger.info(`Creating production movement for org: ${organizationId}`, { data });

      const { finished_product_id, quantity_to_produce, warehouse_id, reference } = data;

      if (!finished_product_id || !quantity_to_produce || !warehouse_id) {
        throw new Error('finished_product_id, quantity_to_produce, and warehouse_id are required');
      }
      if (typeof quantity_to_produce !== 'number' || quantity_to_produce <= 0) {
        throw new Error('quantity_to_produce must be a number greater than 0');
      }

      // Validate warehouse belongs to org
      const warehouse = await this.warehouseRepository.findById(warehouse_id);
      if (!warehouse || warehouse.organization_id !== organizationId) {
        throw new Error('Warehouse not found or does not belong to your organization');
      }

      // Call Supabase RPC — PostgreSQL handles all stock debits/credits atomically
      const { data: result, error } = await this.stockMovementRepository.client
        .rpc('create_production_movement', {
          p_finished_product_id: finished_product_id,
          p_quantity_to_produce: quantity_to_produce,
          p_warehouse_id: warehouse_id,
          p_organization_id: organizationId,
          p_user_reference: reference || null,
        });

      if (error) {
        // Supabase wraps RAISE EXCEPTION messages in error.message
        throw new Error(error.message);
      }

      this.logger.info(`Production movement created: ${result?.reference}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating production movement: ${error.message}`);
      throw error;
    }
  }
```

**Chosen approach:** Add `callRpc()` to `BaseRepository` so all repositories can call Supabase RPCs.

**Step 6.3a:** In `backend/repositories/BaseRepository.js`, add this method inside the class, before the closing `}`:

```javascript
  /**
   * Call a Supabase RPC function
   * @param {string} functionName - PostgreSQL function name
   * @param {Object} params - Named parameters object
   * @returns {Promise<*>} RPC result data
   */
  async callRpc(functionName, params) {
    try {
      const { data, error } = await this.client.rpc(functionName, params);
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`RPC ${functionName} error: ${error?.message || String(error)}`);
    }
  }
```

**Step 6.3b:** In the `createProductionMovement` method of `StockMovementService`, the RPC call uses:

```javascript
      const result = await this.stockMovementRepository.callRpc('create_production_movement', {
        p_finished_product_id: finished_product_id,
        p_quantity_to_produce: quantity_to_produce,
        p_warehouse_id: warehouse_id,
        p_organization_id: organizationId,
        p_user_reference: reference || null,
      });
```

(Replace the `.client.rpc(...)` block shown earlier with this.)

- [ ] **Step 6.4: Add production endpoint to StockMovementController**

Add to `backend/controllers/StockMovementController.js`:

```javascript
  /**
   * Create production movement (BOM)
   * POST /api/stock-movements/production
   */
  async createProductionMovement(req, res, next) {
    try {
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const result = await this.stockMovementService.createProductionMovement(req.body, orgId);

      res.status(201).json({
        message: 'Production movement created successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error('Error creating production movement', { error: error.message });

      if (error.message.includes('required') || error.message.includes('Insufficient stock') ||
          error.message.includes('not found') || error.message.includes('No formula')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
```

- [ ] **Step 6.5: Read stockMovements.js before editing**

```bash
grep -n "router.post" backend/routes/stockMovements.js
```
Expected output includes a line like `99:  router.post('/',`. The production route must be added BEFORE this line (Express matches in order).

- [ ] **Step 6.6: Add production route to stockMovements.js**

In `backend/routes/stockMovements.js`, add immediately before the `router.post('/', ...)` block:

```javascript
  // POST /api/stock-movements/production
  router.post('/production',
    checkOrganizationLimit('stock_movements_per_month'),
    async (req, res, next) => {
      try {
        logger.info('POST /api/stock-movements/production', { body: req.body });
        await stockMovementController.createProductionMovement(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );
```

- [ ] **Step 6.7: Commit**

```bash
git add backend/services/StockMovementService.js backend/repositories/BaseRepository.js backend/controllers/StockMovementController.js backend/routes/stockMovements.js backend/validations/stockMovementValidation.js
git commit -m "feat: add createProductionMovement to StockMovementService and production endpoint"
```

---

## Task 7: Frontend — Types and API Service

**Files:**
- Create: `frontend/src/types/productFormula.ts`
- Create: `frontend/src/services/api/productFormulaService.ts`

- [ ] **Step 7.1: Write types**

```typescript
// frontend/src/types/productFormula.ts

export interface ProductFormulaItem {
  formula_id: string;
  finished_product_id: string;
  raw_material_id: string;
  quantity_required: number;
  organization_id: string;
  created_at?: string;
  raw_material?: {
    product_id: string;
    name: string;
    unit?: string;
  };
}

export interface AddFormulaItemData {
  finished_product_id: string;
  raw_material_id: string;
  quantity_required: number;
}

export interface ProductionMovementRequest {
  finished_product_id: string;
  quantity_to_produce: number;
  warehouse_id: string;
  reference?: string;
}

export interface ProductionMaterialCheck {
  product_id: string;
  name: string;
  quantity_required: number;
  current_stock: number;
  sufficient: boolean;
}

export interface ProductionPreview {
  finished_product: { product_id: string; name: string };
  quantity_to_produce: number;
  materials_to_consume: ProductionMaterialCheck[];
  can_produce: boolean;
}
```

- [ ] **Step 7.2: Write API service**

```typescript
// frontend/src/services/api/productFormulaService.ts
import { httpClient } from '../http/httpClient';
import type {
  ProductFormulaItem,
  AddFormulaItemData,
  ProductionMovementRequest,
  ProductionPreview,
} from '../../types/productFormula';

export const productFormulaService = {
  async getFormula(productId: string): Promise<ProductFormulaItem[]> {
    const response = await httpClient.get<{ data: ProductFormulaItem[] }>(
      `/api/product-formulas/${productId}`
    );
    return response.data || response;
  },

  async addFormulaItem(data: AddFormulaItemData): Promise<{ message: string; data: ProductFormulaItem }> {
    return httpClient.post('/api/product-formulas', data);
  },

  async updateFormulaItem(
    formulaId: string,
    quantity_required: number
  ): Promise<{ message: string; data: ProductFormulaItem }> {
    return httpClient.put(`/api/product-formulas/${formulaId}`, { quantity_required });
  },

  async deleteFormulaItem(formulaId: string): Promise<{ message: string }> {
    return httpClient.delete(`/api/product-formulas/${formulaId}`);
  },

  async validateProduction(
    productId: string,
    quantity: number,
    warehouseId: string
  ): Promise<ProductionPreview> {
    const response = await httpClient.get<{ data: ProductionPreview }>(
      `/api/product-formulas/${productId}/validate?quantity=${quantity}&warehouseId=${warehouseId}`
    );
    return response.data || response;
  },

  async createProductionMovement(
    data: ProductionMovementRequest
  ): Promise<{ message: string; data: unknown }> {
    return httpClient.post('/api/stock-movements/production', data);
  },
};
```

- [ ] **Step 7.3: Commit**

```bash
git add frontend/src/types/productFormula.ts frontend/src/services/api/productFormulaService.ts
git commit -m "feat: add ProductFormula types and API service"
```

---

## Task 8: Frontend — React Query Hooks

**Files:**
- Create: `frontend/src/hooks/useProductFormula.ts`

- [ ] **Step 8.1: Write hooks**

```typescript
// frontend/src/hooks/useProductFormula.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productFormulaService } from '../services/api/productFormulaService';
import { toast } from '../lib/toast';
import { useOrganization } from '../context/OrganizationContext';
import type { AddFormulaItemData, ProductionMovementRequest } from '../types/productFormula';

export function useProductFormula(productId: string | undefined) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['product-formula', productId, currentOrganization?.organization_id],
    queryFn: () => productFormulaService.getFormula(productId!),
    enabled: !!productId && !!currentOrganization,
    staleTime: 30 * 1000, // 30s — formula changes are infrequent
  });
}

export function useProductionPreview(
  productId: string | undefined,
  quantity: number,
  warehouseId: string | undefined
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['production-preview', productId, quantity, warehouseId, currentOrganization?.organization_id],
    queryFn: () => productFormulaService.validateProduction(productId!, quantity, warehouseId!),
    enabled: !!productId && quantity > 0 && !!warehouseId && !!currentOrganization,
    staleTime: 0, // Always fresh — shows real-time stock
  });
}

export function useAddFormulaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddFormulaItemData) => productFormulaService.addFormulaItem(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', variables.finished_product_id] });
      toast.success('Componente agregado a la fórmula');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agregar componente');
      throw error;
    },
  });
}

export function useUpdateFormulaItem(finishedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formulaId, quantity_required }: { formulaId: string; quantity_required: number }) =>
      productFormulaService.updateFormulaItem(formulaId, quantity_required),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', finishedProductId] });
      toast.success('Cantidad actualizada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
      throw error;
    },
  });
}

export function useDeleteFormulaItem(finishedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formulaId: string) => productFormulaService.deleteFormulaItem(formulaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-formula', finishedProductId] });
      toast.success('Componente eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
      throw error;
    },
  });
}

export function useCreateProductionMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductionMovementRequest) =>
      productFormulaService.createProductionMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['production-preview'] });
      toast.success('Elaboración registrada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar elaboración');
      throw error;
    },
  });
}
```

- [ ] **Step 8.2: Commit**

```bash
git add frontend/src/hooks/useProductFormula.ts
git commit -m "feat: add useProductFormula React Query hooks"
```

---

## Task 9: Frontend — ProductFormulaEditor Component

**Files:**
- Create: `frontend/src/components/features/products/ProductFormulaEditor.tsx`

This component is embedded inside the product edit form when `product_type === 'finished_good'`.

- [ ] **Step 9.1: Write component**

```tsx
// frontend/src/components/features/products/ProductFormulaEditor.tsx
import { useState } from 'react';
import { Trash, Plus, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useProducts } from '../../../hooks/useProducts';
import {
  useProductFormula,
  useAddFormulaItem,
  useUpdateFormulaItem,
  useDeleteFormulaItem,
} from '../../../hooks/useProductFormula';

interface ProductFormulaEditorProps {
  finishedProductId: string;
}

export function ProductFormulaEditor({ finishedProductId }: ProductFormulaEditorProps) {
  const [newItem, setNewItem] = useState({ raw_material_id: '', quantity_required: '' });

  const { data: formula = [], isLoading } = useProductFormula(finishedProductId);
  const { data: allProductsResult } = useProducts();
  const allProducts = allProductsResult?.data || [];
  const rawMaterials = allProducts.filter((p: any) => p.product_type === 'raw_material');

  const addItem = useAddFormulaItem();
  const updateItem = useUpdateFormulaItem(finishedProductId);
  const deleteItem = useDeleteFormulaItem(finishedProductId);

  const handleAdd = async () => {
    if (!newItem.raw_material_id || !newItem.quantity_required) return;
    await addItem.mutateAsync({
      finished_product_id: finishedProductId,
      raw_material_id: newItem.raw_material_id,
      quantity_required: Number(newItem.quantity_required),
    });
    setNewItem({ raw_material_id: '', quantity_required: '' });
  };

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando fórmula...</div>;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Fórmula BOM (componentes requeridos)</h4>

      {formula.length === 0 && (
        <p className="text-sm text-gray-400 italic">Sin componentes definidos.</p>
      )}

      <ul className="space-y-2">
        {formula.map((item) => (
          <li key={item.formula_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm">{item.raw_material?.name || item.raw_material_id}</span>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              defaultValue={item.quantity_required}
              className="w-24 border rounded px-2 py-1 text-sm"
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (val > 0 && val !== item.quantity_required) {
                  updateItem.mutate({ formulaId: item.formula_id, quantity_required: val });
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteItem.mutate(item.formula_id)}
              disabled={deleteItem.isPending}
            >
              <Trash className="w-4 h-4 text-red-500" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 pt-2 border-t">
        <select
          value={newItem.raw_material_id}
          onChange={(e) => setNewItem(p => ({ ...p, raw_material_id: e.target.value }))}
          className="flex-1 border rounded px-2 py-1 text-sm"
        >
          <option value="">Seleccionar materia prima...</option>
          {rawMaterials.map((p: any) => (
            <option key={p.product_id} value={p.product_id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="Cantidad"
          value={newItem.quantity_required}
          onChange={(e) => setNewItem(p => ({ ...p, quantity_required: e.target.value }))}
          className="w-24 border rounded px-2 py-1 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.raw_material_id || !newItem.quantity_required || addItem.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add frontend/src/components/features/products/ProductFormulaEditor.tsx
git commit -m "feat: add ProductFormulaEditor component for BOM management"
```

---

## Task 10: Frontend — ProductionMovementForm Component

**Files:**
- Create: `frontend/src/components/features/stock-movements/ProductionMovementForm.tsx`

This component replaces the standard movement form when the user selects type `'production'`.

- [ ] **Step 10.1: Write component**

```tsx
// frontend/src/components/features/stock-movements/ProductionMovementForm.tsx
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useProducts } from '../../../hooks/useProducts';
import { useWarehouses } from '../../../hooks/useWarehouse';
import { useProductionPreview, useCreateProductionMovement } from '../../../hooks/useProductFormula';

interface ProductionMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductionMovementForm({ onSuccess, onCancel }: ProductionMovementFormProps) {
  const [form, setForm] = useState({
    finished_product_id: '',
    quantity_to_produce: '',
    warehouse_id: '',
    reference: '',
  });

  const { data: productsResult } = useProducts();
  const allProducts = productsResult?.data || [];
  const finishedGoods = allProducts.filter((p: any) => p.product_type === 'finished_good');

  const { data: warehouses = [] } = useWarehouses();

  const { data: preview, isFetching: loadingPreview } = useProductionPreview(
    form.finished_product_id || undefined,
    Number(form.quantity_to_produce) || 0,
    form.warehouse_id || undefined
  );

  const createProduction = useCreateProductionMovement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview?.can_produce) return;

    await createProduction.mutateAsync({
      finished_product_id: form.finished_product_id,
      quantity_to_produce: Number(form.quantity_to_produce),
      warehouse_id: form.warehouse_id,
      reference: form.reference || undefined,
    });
    onSuccess?.();
  };

  const showPreview = !!form.finished_product_id && Number(form.quantity_to_produce) > 0 && !!form.warehouse_id;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Producto a elaborar</label>
        <select
          required
          value={form.finished_product_id}
          onChange={(e) => setForm(p => ({ ...p, finished_product_id: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar producto terminado...</option>
          {finishedGoods.map((p: any) => (
            <option key={p.product_id} value={p.product_id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Cantidad a producir</label>
        <input
          type="number"
          required
          min="0.0001"
          step="0.0001"
          value={form.quantity_to_produce}
          onChange={(e) => setForm(p => ({ ...p, quantity_to_produce: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Depósito</label>
        <select
          required
          value={form.warehouse_id}
          onChange={(e) => setForm(p => ({ ...p, warehouse_id: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar depósito...</option>
          {warehouses.map((w: any) => (
            <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Referencia (opcional)</label>
        <input
          type="text"
          value={form.reference}
          onChange={(e) => setForm(p => ({ ...p, reference: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Ej: OP-001"
        />
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="border rounded p-3 space-y-2 bg-gray-50">
          <p className="text-sm font-medium">Vista previa de consumo:</p>

          {loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando stock...
            </div>
          ) : preview ? (
            <>
              {preview.materials_to_consume.map((m) => (
                <div key={m.product_id} className="flex items-center gap-2 text-sm">
                  {m.sufficient
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  }
                  <span className="flex-1">{m.name}</span>
                  <span className={m.sufficient ? 'text-green-700' : 'text-red-700'}>
                    Requerido: {m.quantity_required} / Disponible: {m.current_stock}
                  </span>
                </div>
              ))}
              {!preview.can_produce && (
                <p className="text-sm text-red-600 font-medium">
                  Stock insuficiente para completar la elaboración.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={createProduction.isPending || (showPreview && !preview?.can_produce)}
        >
          {createProduction.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Procesando...</>
          ) : 'Confirmar Elaboración'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 10.2: Commit**

```bash
git add frontend/src/components/features/stock-movements/ProductionMovementForm.tsx
git commit -m "feat: add ProductionMovementForm with real-time stock preview"
```

---

## Task 11: Frontend — Integrate into Products page

**Files:**
- Modify: `frontend/src/validations/productValidation.ts` — add `product_type` to Yup schema
- Modify: `frontend/src/components/features/products/product-form.tsx` — add `product_type` select field
- Modify: `frontend/src/components/features/products/product-modal.tsx` — render `ProductFormulaEditor` in edit mode

The product form uses Yup + react-hook-form. `ProductFormData` is a type inferred from the Yup schema in `productValidation.ts`. `product-form.tsx` renders the fields using `form.register(...)`. `product-modal.tsx` orchestrates the modal and calls save.

- [ ] **Step 11.1: Add `product_type` to Yup schema in productValidation.ts**

In `frontend/src/validations/productValidation.ts`, inside the `createProductSchema` Yup object (after the last field), add:

```typescript
  product_type: yup
    .string()
    .oneOf(['standard', 'raw_material', 'finished_good'])
    .default('standard')
    .optional(),
```

Also add the same field to the `updateProductSchema` if it exists in that file.

- [ ] **Step 11.2: Add product_type select field in product-form.tsx**

In `frontend/src/components/features/products/product-form.tsx`, after the existing fields (e.g., after the `name` or `description` field), add:

```tsx
{/* product_type field */}
<div className="space-y-2">
  <Label htmlFor="product_type">Tipo de producto</Label>
  <select
    id="product_type"
    disabled={isViewMode}
    {...register('product_type')}
    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
  >
    <option value="standard">Estándar</option>
    <option value="raw_material">Materia prima</option>
    <option value="finished_good">Producto terminado (BOM)</option>
  </select>
</div>
```

- [ ] **Step 11.3: Render ProductFormulaEditor in product-modal.tsx**

In `frontend/src/components/features/products/product-modal.tsx`:

1. Import `ProductFormulaEditor`:
```tsx
import { ProductFormulaEditor } from './ProductFormulaEditor';
```

2. Watch the `product_type` field from the form:
```tsx
const productType = form.watch('product_type');
const editingProductId = mode === 'edit' ? product?.product_id : undefined;
```

3. Inside the modal body (after the `<ProductForm .../>` rendering), add:
```tsx
{mode === 'edit' && productType === 'finished_good' && editingProductId && (
  <div className="mt-4 border-t pt-4">
    <ProductFormulaEditor finishedProductId={editingProductId} />
  </div>
)}
```

- [ ] **Step 11.4: Verify Products page renders without errors**

```bash
cd frontend && bun run build 2>&1 | tail -20
```
Expected: no TypeScript errors related to product_type or ProductFormulaEditor.

- [ ] **Step 11.5: Commit**

```bash
git add frontend/src/validations/productValidation.ts frontend/src/components/features/products/product-form.tsx frontend/src/components/features/products/product-modal.tsx frontend/src/components/features/products/ProductFormulaEditor.tsx
git commit -m "feat: add product_type field and ProductFormulaEditor to Products page"
```

---

## Task 12: Frontend — Integrate ProductionMovementForm into StockMovements page

**File:** `frontend/src/pages/Dashboard/StockMovements.tsx`

- [ ] **Step 12.1: Read StockMovementModal to understand type selector**

```bash
grep -n "movement_type\|production" frontend/src/components/features/stock-movements/stock-movement-modal.tsx 2>/dev/null | head -20
```

- [ ] **Step 12.2: Add 'production' to the movement_type options in StockMovementModal**

Find where movement types are listed (e.g., `entry`, `exit`, `adjustment`) and add:

```tsx
<option value="production">Elaboración</option>
```

- [ ] **Step 12.3: Render ProductionMovementForm conditionally**

In `StockMovements.tsx`, import `ProductionMovementForm` and render it when `movement_type === 'production'`:

```tsx
import { ProductionMovementForm } from '../../components/features/stock-movements/ProductionMovementForm';

// Inside the modal, when creating:
{modal.mode === 'create' && selectedType === 'production' ? (
  <ProductionMovementForm
    onSuccess={closeModal}
    onCancel={closeModal}
  />
) : (
  // existing StockMovementModal content
)}
```

Note: You'll need to either lift the `selectedType` state up or read it from the form state. Adapt to the actual modal structure after reading it.

- [ ] **Step 12.4: Verify build**

```bash
cd frontend && bun run build 2>&1 | tail -20
```
Expected: clean build.

- [ ] **Step 12.5: Commit**

```bash
git add frontend/src/pages/Dashboard/StockMovements.tsx frontend/src/components/features/stock-movements/
git commit -m "feat: integrate ProductionMovementForm into StockMovements page"
```

---

## Task 13: End-to-End Verification

- [ ] **Step 13.1: Start backend and frontend**

```bash
# Terminal 1
cd backend && bun run dev

# Terminal 2
cd frontend && bun run dev
```

- [ ] **Step 13.2: Manual test — Define BOM**

1. Create two products: "Harina" (raw_material) and "Pan" (finished_good)
2. Open "Pan" in edit mode
3. In the ProductFormulaEditor, add "Harina" with quantity 0.5
4. Save and verify formula persists

- [ ] **Step 13.3: Manual test — Production movement (happy path)**

1. Create a stock entry for "Harina": +10 units in Depósito A
2. Go to Movimientos → Crear → type: Elaboración
3. Select "Pan", quantity 2, Depósito A
4. Preview should show: Harina requerida: 1 / Disponible: 10 ✓
5. Confirm — verify: Harina stock → 9, Pan stock → 2, reference groups both movements

- [ ] **Step 13.4: Manual test — Production movement (insufficient stock)**

1. Try to produce 30 units of "Pan" (requires 15 Harina but only 9 available)
2. Preview should show: Harina requerida: 15 / Disponible: 9 ✗
3. Confirm button should be disabled
4. Even if API is called directly, it should return 400 with clear message

- [ ] **Step 13.5: Manual test — Cycle detection**

1. Try to add "Pan" (finished_good) as a raw material component of "Harina" (raw_material)
   - Via POST `/api/product-formulas` with `finished_product_id = harina_id, raw_material_id = pan_id`
2. Expected: 400 error "Adding this component would create a cycle in the formula"
   - (Note: this requires Harina to have product_type = finished_good for a direct cycle. For a simpler test: if Pan's formula has ingredient A, try to add Pan as an ingredient of A)

- [ ] **Step 13.6: Manual test — Reference grouping**

After a successful production run, verify all movements share the same `reference`:

```sql
-- Run in Supabase SQL editor, replacing 'PROD-...' with the reference from the API response
SELECT movement_id, movement_type, product_id, quantity, reference
FROM stock_movements
WHERE reference = 'PROD-YYYYMMDD-HHMMSS'
ORDER BY movement_type;
```

Expected: multiple rows (one `exit` per raw material + one `entry` for the finished product), all with the same `reference`.

- [ ] **Step 13.7: Final commit**

```bash
git add .
git commit -m "feat: complete BOM production system - formula editor, production movements, real-time preview"
```
