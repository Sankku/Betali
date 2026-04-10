---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# Product Types & Lots Migration — Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `products` table into `product_types` (SKU catalog) and `product_lots` (batch instances), update all dependent tables and services, and expose new REST API endpoints.

**Architecture:** Clean break migration — data is backed up then wiped, new schema applied, backend rebuilt on top of it. Uses the existing BaseRepository/Service/Controller/Route pattern throughout. Each new entity (product type, product lot) gets its own repository, service, controller, and route file.

**Tech Stack:** Node.js, Express, Supabase (PostgreSQL), Jest (unit tests via `npx jest --config jest.unit.config.js`)

**Spec:** `docs/superpowers/specs/2026-03-27-product-types-lots-migration-design.md`

---

## File Map

**New files:**
- `backend/repositories/ProductTypeRepository.js`
- `backend/repositories/ProductLotRepository.js`
- `backend/services/ProductTypeService.js`
- `backend/services/ProductLotService.js`
- `backend/controllers/ProductTypeController.js`
- `backend/controllers/ProductLotController.js`
- `backend/routes/productTypes.js`
- `backend/routes/productLots.js`
- `backend/validations/productTypeValidation.js`
- `backend/validations/productLotValidation.js`
- `backend/tests/unit/services/ProductTypeService.unit.test.js`
- `backend/tests/unit/services/ProductLotService.unit.test.js`
- `scripts/backup-real-data.sql`
- `backend/migrations/product-types-lots-migration.sql`

**Modified files:**
- `backend/repositories/StockMovementRepository.js` — rename `product_id` → `lot_id` in `getCurrentStock`
- `backend/services/ProductFormulaService.js` — use `product_type_id` instead of `product_id`
- `backend/services/StockMovementService.js` — use `lot_id`, add FEFO dispatch
- `backend/services/OrderService.js` — `order_details` uses `product_type_id` + optional `lot_id`
- `backend/services/PricingService.js` — use `product_type_id` for tax/pricing lookups
- `backend/services/DashboardService.js` — use `productTypeRepository` + `productLotRepository`
- `backend/config/container.js` — register new services/repos, update OrderService/DashboardService wiring
- `backend/app.js` (or wherever routes are mounted) — mount new routes
- `backend/routes/productLots.js` — add `GET /:id` standalone route

**Deleted files (after plan complete):**
- `backend/repositories/ProductRepository.js`
- `backend/services/ProductService.js`
- `backend/controllers/ProductController.js`
- `backend/routes/products.js`
- `backend/tests/unit/ProductService.unit.test.js`
- `backend/tests/unit/ProductController.unit.test.js`

---

## Task 1: Backup Real Data

**Files:**
- Create: `scripts/backup-real-data.sql`

- [ ] **Step 1: Write the backup SQL script**

```sql
-- scripts/backup-real-data.sql
-- Run this in the Supabase SQL editor BEFORE applying the migration.
-- Copy the output and save it somewhere safe.

-- Export organizations
SELECT 'INSERT INTO organizations VALUES (' ||
  quote_literal(organization_id) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(slug) || ',' ||
  COALESCE(quote_literal(plan_type), 'NULL') || ',' ||
  COALESCE(max_users::text, 'NULL') || ',' ||
  COALESCE(max_warehouses::text, 'NULL') ||
  ');'
FROM organizations;

-- Export users (skip password_hash — users will re-auth via Supabase Auth)
SELECT 'INSERT INTO users(user_id,email,name,role,organization_id,is_active,created_at) VALUES (' ||
  quote_literal(user_id) || ',' ||
  quote_literal(email) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(role) || ',' ||
  COALESCE(quote_literal(organization_id), 'NULL') || ',' ||
  COALESCE(is_active::text, 'true') || ',' ||
  COALESCE(quote_literal(created_at), 'NOW()') ||
  ');'
FROM users;

-- Export user_organizations memberships
SELECT 'INSERT INTO user_organizations VALUES (' ||
  quote_literal(user_organization_id) || ',' ||
  quote_literal(user_id) || ',' ||
  quote_literal(organization_id) || ',' ||
  COALESCE(quote_literal(branch_id), 'NULL') || ',' ||
  quote_literal(role) || ',' ||
  quote_literal(permissions::text) || '::jsonb,' ||
  is_active::text || ',' ||
  quote_literal(joined_at) ||
  ');'
FROM user_organizations;

-- Export warehouses
SELECT 'INSERT INTO warehouse(warehouse_id,name,location,organization_id,is_active,created_at) VALUES (' ||
  quote_literal(warehouse_id) || ',' ||
  quote_literal(name) || ',' ||
  COALESCE(quote_literal(location), 'NULL') || ',' ||
  COALESCE(quote_literal(organization_id), 'NULL') || ',' ||
  COALESCE(is_active::text, 'true') || ',' ||
  COALESCE(quote_literal(created_at), 'NOW()') ||
  ');'
FROM warehouse;
```

- [ ] **Step 2: Run the backup script in Supabase SQL editor**

Open the Supabase dashboard → SQL editor → run `scripts/backup-real-data.sql`.
Save the output as `scripts/backup-real-data-output.sql` locally. This is the restore script if anything goes wrong.

- [ ] **Step 3: Commit the backup script**

```bash
git add scripts/backup-real-data.sql
git commit -m "chore: add data backup script for product types migration"
```

---

## Task 2: Database Migration SQL

**Files:**
- Create: `backend/migrations/product-types-lots-migration.sql`

This is the largest task. Read the full script carefully before running it.

- [ ] **Step 1: Write the migration SQL**

```sql
-- backend/migrations/product-types-lots-migration.sql
-- Apply in Supabase SQL editor AFTER backing up real data.
-- This is a DESTRUCTIVE migration — all product/stock/order data is wiped.

-- ============================================================
-- STEP 1: Truncate all transactional data (order matters for FK)
-- ============================================================
TRUNCATE TABLE
  stock_reservations,
  stock_movements,
  order_details,
  orders,
  applied_discounts,
  product_formulas,
  inventory_alerts,
  customer_pricing,
  discount_rule_products,
  product_tax_groups,
  purchase_order_details
CASCADE;

DELETE FROM products; -- will be renamed, can't truncate before removing FK deps

-- ============================================================
-- STEP 2: Drop all FK constraints that reference products.product_id
-- (must drop before renaming the column)
-- ============================================================
ALTER TABLE stock_movements      DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;
ALTER TABLE stock_reservations   DROP CONSTRAINT IF EXISTS stock_reservations_product_id_fkey;
ALTER TABLE inventory_alerts     DROP CONSTRAINT IF EXISTS inventory_alerts_product_id_fkey;
ALTER TABLE order_details        DROP CONSTRAINT IF EXISTS order_details_product_id_fkey;
ALTER TABLE product_formulas     DROP CONSTRAINT IF EXISTS product_formulas_finished_product_id_fkey;
ALTER TABLE product_formulas     DROP CONSTRAINT IF EXISTS product_formulas_raw_material_id_fkey;
ALTER TABLE customer_pricing     DROP CONSTRAINT IF EXISTS customer_pricing_product_id_fkey;
ALTER TABLE discount_rule_products DROP CONSTRAINT IF EXISTS discount_rule_products_product_id_fkey;
ALTER TABLE purchase_order_details DROP CONSTRAINT IF EXISTS purchase_order_details_product_id_fkey;
-- Note: product_tax_groups constraint name may vary — check your DB
ALTER TABLE product_tax_groups   DROP CONSTRAINT IF EXISTS product_tax_groups_product_id_fkey;

-- ============================================================
-- STEP 3: Rename products → product_lots, rename key columns
-- ============================================================
ALTER TABLE products RENAME TO product_lots;
ALTER TABLE product_lots RENAME COLUMN product_id TO lot_id;
ALTER TABLE product_lots RENAME COLUMN batch_number TO lot_number;

-- Drop columns that move to product_types
ALTER TABLE product_lots
  DROP COLUMN IF EXISTS product_type,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS min_stock,
  DROP COLUMN IF EXISTS max_stock,
  DROP COLUMN IF EXISTS alert_enabled,
  DROP COLUMN IF EXISTS name;

-- ============================================================
-- STEP 4: Create product_types table
-- ============================================================
CREATE TABLE product_types (
  product_type_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               VARCHAR(100) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  product_type      VARCHAR(20) NOT NULL DEFAULT 'standard'
                    CONSTRAINT product_types_product_type_check
                    CHECK (product_type IN ('standard', 'raw_material', 'finished_good')),
  unit              VARCHAR(20) NOT NULL DEFAULT 'unidad'
                    CONSTRAINT product_types_unit_check
                    CHECK (unit IN ('kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena')),
  min_stock         NUMERIC(10,4),
  max_stock         NUMERIC(10,4),
  description       TEXT,
  alert_enabled     BOOLEAN DEFAULT true,
  senasa_product_id UUID REFERENCES senasa_products(senasa_product_id),
  organization_id   UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(branch_id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_types_sku_org_unique UNIQUE(sku, organization_id)
);

-- ============================================================
-- STEP 5: Add product_type_id FK to product_lots
-- ============================================================
ALTER TABLE product_lots
  ADD COLUMN product_type_id UUID NOT NULL REFERENCES product_types(product_type_id) ON DELETE RESTRICT;

ALTER TABLE product_lots
  ADD CONSTRAINT product_lots_lot_number_org_unique UNIQUE(lot_number, organization_id);

-- ============================================================
-- STEP 6: Update FK columns on dependent tables
-- ============================================================

-- stock_movements: product_id → lot_id
ALTER TABLE stock_movements RENAME COLUMN product_id TO lot_id;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_lot_id_fkey
  FOREIGN KEY (lot_id) REFERENCES product_lots(lot_id);

-- stock_reservations: product_id → lot_id
ALTER TABLE stock_reservations RENAME COLUMN product_id TO lot_id;
ALTER TABLE stock_reservations
  ADD CONSTRAINT stock_reservations_lot_id_fkey
  FOREIGN KEY (lot_id) REFERENCES product_lots(lot_id);

-- inventory_alerts: product_id → product_type_id
ALTER TABLE inventory_alerts RENAME COLUMN product_id TO product_type_id;
ALTER TABLE inventory_alerts
  ADD CONSTRAINT inventory_alerts_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- order_details: product_id → product_type_id (required) + lot_id (nullable)
ALTER TABLE order_details RENAME COLUMN product_id TO product_type_id;
ALTER TABLE order_details
  ADD COLUMN lot_id UUID REFERENCES product_lots(lot_id);
ALTER TABLE order_details
  ADD CONSTRAINT order_details_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- product_formulas: both columns → product_type_id
ALTER TABLE product_formulas RENAME COLUMN finished_product_id TO finished_product_type_id;
ALTER TABLE product_formulas RENAME COLUMN raw_material_id TO raw_material_type_id;
ALTER TABLE product_formulas
  ADD CONSTRAINT product_formulas_finished_product_type_id_fkey
  FOREIGN KEY (finished_product_type_id) REFERENCES product_types(product_type_id) ON DELETE CASCADE;
ALTER TABLE product_formulas
  ADD CONSTRAINT product_formulas_raw_material_type_id_fkey
  FOREIGN KEY (raw_material_type_id) REFERENCES product_types(product_type_id) ON DELETE RESTRICT;

-- customer_pricing: product_id → product_type_id
ALTER TABLE customer_pricing RENAME COLUMN product_id TO product_type_id;
ALTER TABLE customer_pricing
  ADD CONSTRAINT customer_pricing_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- discount_rule_products: product_id → product_type_id
ALTER TABLE discount_rule_products RENAME COLUMN product_id TO product_type_id;
ALTER TABLE discount_rule_products
  ADD CONSTRAINT discount_rule_products_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- purchase_order_details: product_id → product_type_id
ALTER TABLE purchase_order_details RENAME COLUMN product_id TO product_type_id;
ALTER TABLE purchase_order_details
  ADD CONSTRAINT purchase_order_details_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- product_tax_groups: product_id → product_type_id
ALTER TABLE product_tax_groups RENAME COLUMN product_id TO product_type_id;
ALTER TABLE product_tax_groups
  ADD CONSTRAINT product_tax_groups_product_type_id_fkey
  FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id);

-- ============================================================
-- STEP 7: RLS policies for new tables
-- ============================================================
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_isolation" ON product_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

ALTER TABLE product_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_isolation" ON product_lots
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 8: Update the create_production_movement RPC function
-- (references product_formulas columns that were renamed)
-- ============================================================
CREATE OR REPLACE FUNCTION create_production_movement(
  p_finished_product_type_id UUID,
  p_quantity_to_produce       NUMERIC,
  p_warehouse_id              UUID,
  p_organization_id           UUID,
  p_user_reference            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_formula           RECORD;
  v_lot               RECORD;
  v_selected_lot_id   UUID;
  v_current_stock     NUMERIC;
  v_movement_date     TIMESTAMPTZ := now();
  v_reference         TEXT;
  v_movements         JSONB := '[]'::JSONB;
  v_required          NUMERIC;
BEGIN
  v_reference := COALESCE(p_user_reference, 'PROD-' || to_char(v_movement_date, 'YYYYMMDD-HH24MISS'));

  IF NOT EXISTS (
    SELECT 1 FROM product_formulas
    WHERE finished_product_type_id = p_finished_product_type_id
      AND organization_id = p_organization_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No formula found for product type % in organization %',
      p_finished_product_type_id, p_organization_id;
  END IF;

  FOR v_formula IN
    SELECT pf.formula_id, pf.raw_material_type_id, pf.quantity_required,
           pt.name AS raw_material_name
    FROM product_formulas pf
    JOIN product_types pt ON pt.product_type_id = pf.raw_material_type_id
    WHERE pf.finished_product_type_id = p_finished_product_type_id
      AND pf.organization_id = p_organization_id
  LOOP
    v_required := v_formula.quantity_required * p_quantity_to_produce;

    -- FEFO: find earliest non-expired lot for this raw material type that has
    -- sufficient stock IN THE TARGET WAREHOUSE. Iterate in expiration order.
    v_selected_lot_id := NULL;
    v_current_stock := 0;

    FOR v_lot IN
      SELECT pl.lot_id, pl.expiration_date
      FROM product_lots pl
      WHERE pl.product_type_id = v_formula.raw_material_type_id
        AND pl.organization_id = p_organization_id
        AND pl.expiration_date >= CURRENT_DATE
      ORDER BY pl.expiration_date ASC
    LOOP
      SELECT COALESCE(SUM(
        CASE
          WHEN movement_type = 'entry' THEN quantity
          WHEN movement_type IN ('exit', 'production') THEN -quantity
          ELSE 0
        END
      ), 0)
      INTO v_current_stock
      FROM stock_movements
      WHERE lot_id = v_lot.lot_id
        AND warehouse_id = p_warehouse_id
        AND organization_id = p_organization_id;

      IF v_current_stock >= v_required THEN
        v_selected_lot_id := v_lot.lot_id;
        EXIT; -- found a lot with sufficient stock in this warehouse
      END IF;
    END LOOP;

    IF v_selected_lot_id IS NULL THEN
      RAISE EXCEPTION 'Insufficient stock for "%": required %, available % in warehouse %',
        v_formula.raw_material_name, v_required, v_current_stock, p_warehouse_id;
    END IF;

    INSERT INTO stock_movements (
      lot_id, warehouse_id, organization_id,
      movement_type, quantity, movement_date, reference, notes
    ) VALUES (
      v_selected_lot_id, p_warehouse_id, p_organization_id,
      'production', v_required, v_movement_date, v_reference,
      'Production consumption: ' || v_reference
    );

    v_movements := v_movements || jsonb_build_object(
      'lot_id', v_selected_lot_id,
      'name', v_formula.raw_material_name,
      'quantity_consumed', v_required
    );
  END LOOP;

  -- Entry for finished product: pick or create a lot (simplified: use first available lot)
  SELECT lot_id INTO v_lot
  FROM product_lots
  WHERE product_type_id = p_finished_product_type_id
    AND organization_id = p_organization_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lot.lot_id IS NULL THEN
    RAISE EXCEPTION 'No lot found for finished product type %', p_finished_product_type_id;
  END IF;

  INSERT INTO stock_movements (
    lot_id, warehouse_id, organization_id,
    movement_type, quantity, movement_date, reference, notes
  ) VALUES (
    v_lot.lot_id, p_warehouse_id, p_organization_id,
    'entry', p_quantity_to_produce, v_movement_date, v_reference,
    'Production output: ' || v_reference
  );

  RETURN jsonb_build_object(
    'reference', v_reference,
    'finished_product_type_id', p_finished_product_type_id,
    'quantity_produced', p_quantity_to_produce,
    'materials_consumed', v_movements
  );
END;
$$;
```

- [ ] **Step 2: Run the migration in Supabase SQL editor**

Execute `backend/migrations/product-types-lots-migration.sql` in the Supabase dashboard → SQL editor.
Expected: no errors. Verify by running:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('product_types', 'product_lots');
-- Should return 2 rows
```

- [ ] **Step 3: Regenerate TypeScript types**

```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant
supabase gen types typescript --project-id gzqjhtzuongvbtdwvzaz \
  > frontend/src/types/database.ts
```

- [ ] **Step 4: Commit migration + updated types**

```bash
git add backend/migrations/product-types-lots-migration.sql frontend/src/types/database.ts
git commit -m "feat: apply product types & lots schema migration"
```

---

## Task 3: ProductTypeRepository

**Files:**
- Create: `backend/repositories/ProductTypeRepository.js`
- Test: `backend/tests/unit/repositories/ProductTypeRepository.unit.test.js`

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/unit/repositories/ProductTypeRepository.unit.test.js
const { ProductTypeRepository } = require('../../../repositories/ProductTypeRepository');

describe('ProductTypeRepository', () => {
  let repo;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn(),
      ilike: jest.fn().mockReturnThis(),
    };
    repo = new ProductTypeRepository(mockClient);
  });

  test('constructor sets table to product_types', () => {
    expect(repo.table).toBe('product_types');
  });

  test('findBySku returns type when found', async () => {
    mockClient.single.mockResolvedValue({ data: { product_type_id: 'pt-1', sku: 'HARINA-001' }, error: null });
    const result = await repo.findBySku('HARINA-001', 'org-1');
    expect(result).toEqual({ product_type_id: 'pt-1', sku: 'HARINA-001' });
  });

  test('findByOrg returns array', async () => {
    // Override findAll via the base class mock
    repo.findAll = jest.fn().mockResolvedValue([{ product_type_id: 'pt-1' }]);
    const result = await repo.findByOrg('org-1');
    expect(repo.findAll).toHaveBeenCalledWith({ organization_id: 'org-1' }, {});
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/repositories/ProductTypeRepository.unit.test.js --no-coverage
```

Expected: `Cannot find module '../../../repositories/ProductTypeRepository'`

- [ ] **Step 3: Write the implementation**

```js
// backend/repositories/ProductTypeRepository.js
const { BaseRepository } = require('./BaseRepository');

class ProductTypeRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_types');
  }

  async findById(id, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('product_type_id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product type by ID: ${error?.message || String(error)}`);
    }
  }

  async findByOrg(organizationId, options = {}) {
    return this.findAll({ organization_id: organizationId }, options);
  }

  async findBySku(sku, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('sku', sku)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product type by SKU: ${error?.message || String(error)}`);
    }
  }

  async search(searchTerm, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error searching product types: ${error?.message || String(error)}`);
    }
  }
}

module.exports = { ProductTypeRepository };
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/repositories/ProductTypeRepository.unit.test.js --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add backend/repositories/ProductTypeRepository.js backend/tests/unit/repositories/ProductTypeRepository.unit.test.js
git commit -m "feat: add ProductTypeRepository"
```

---

## Task 4: ProductLotRepository

**Files:**
- Create: `backend/repositories/ProductLotRepository.js`

- [ ] **Step 1: Write the implementation** (follows the exact same pattern as ProductTypeRepository)

```js
// backend/repositories/ProductLotRepository.js
const { BaseRepository } = require('./BaseRepository');

class ProductLotRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_lots');
  }

  async findById(id, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*, product_types(*)')
        .eq('lot_id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product lot by ID: ${error?.message || String(error)}`);
    }
  }

  async findByOrg(organizationId, options = {}) {
    return this.findAll({ organization_id: organizationId }, options);
  }

  async findByType(productTypeId, organizationId, options = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    return this.findAll({ product_type_id: productTypeId, organization_id: organizationId }, options);
  }

  async findByLotNumber(lotNumber, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('lot_number', lotNumber)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding lot by number: ${error?.message || String(error)}`);
    }
  }

  async findExpiringByOrg(days = 30, organizationId) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const { data, error } = await this.client
        .from(this.table)
        .select('*, product_types(name, sku)')
        .eq('organization_id', organizationId)
        .gte('expiration_date', new Date().toISOString().split('T')[0])
        .lte('expiration_date', futureDate.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding expiring lots: ${error?.message || String(error)}`);
    }
  }

  /**
   * Find non-expired lots for a product type, ordered by expiration_date ASC (FEFO order).
   */
  async findForFefo(productTypeId, warehouseId, organizationId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await this.client
        .from(this.table)
        .select('lot_id, lot_number, expiration_date')
        .eq('product_type_id', productTypeId)
        .eq('organization_id', organizationId)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding FEFO lots: ${error?.message || String(error)}`);
    }
  }
}

module.exports = { ProductLotRepository };
```

- [ ] **Step 2: Run unit tests to confirm nothing broken**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/ProductLotRepository.js
git commit -m "feat: add ProductLotRepository"
```

---

## Task 5: ProductTypeService

**Files:**
- Create: `backend/services/ProductTypeService.js`
- Test: `backend/tests/unit/services/ProductTypeService.unit.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// backend/tests/unit/services/ProductTypeService.unit.test.js
const { ProductTypeService } = require('../../../services/ProductTypeService');

describe('ProductTypeService', () => {
  let service;
  let mockRepo;
  let mockLogger;

  beforeEach(() => {
    mockRepo = {
      findByOrg: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    service = new ProductTypeService(mockRepo, mockLogger);
  });

  describe('createType', () => {
    test('creates type when SKU is unique', async () => {
      mockRepo.findBySku.mockResolvedValue(null); // no existing
      mockRepo.create.mockResolvedValue({ product_type_id: 'pt-1', sku: 'HARINA-001' });
      const result = await service.createType({ sku: 'HARINA-001', name: 'Harina', product_type: 'raw_material', unit: 'kg' }, 'org-1');
      expect(result.product_type_id).toBe('pt-1');
    });

    test('throws 409 when SKU already exists', async () => {
      mockRepo.findBySku.mockResolvedValue({ product_type_id: 'existing' });
      await expect(service.createType({ sku: 'HARINA-001', name: 'Harina', product_type: 'raw_material', unit: 'kg' }, 'org-1'))
        .rejects.toMatchObject({ status: 409 });
    });

    test('throws when required fields missing', async () => {
      await expect(service.createType({ name: 'Harina' }, 'org-1'))
        .rejects.toThrow();
    });
  });

  describe('deleteType', () => {
    test('throws 404 when type not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.deleteType('pt-missing', 'org-1'))
        .rejects.toMatchObject({ status: 404 });
    });

    test('throws 409 with lot_count when lots still exist', async () => {
      mockRepo.findById.mockResolvedValue({ product_type_id: 'pt-1' });
      // Simulate the Supabase count query returning 2 lots
      mockRepo.client = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: undefined,
      };
      mockRepo.client.eq.mockResolvedValue({ data: [{ lot_id: 'l1' }, { lot_id: 'l2' }], error: null });
      await expect(service.deleteType('pt-1', 'org-1'))
        .rejects.toMatchObject({ status: 409, lot_count: 2 });
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/services/ProductTypeService.unit.test.js --no-coverage
```

- [ ] **Step 3: Write the implementation**

```js
// backend/services/ProductTypeService.js
const { Logger } = require('../utils/Logger');

class ProductTypeService {
  constructor(productTypeRepository, logger) {
    this.repo = productTypeRepository;
    this.logger = logger || new Logger('ProductTypeService');
  }

  async getTypes(organizationId, options = {}) {
    return this.repo.findByOrg(organizationId, options);
  }

  async getTypeById(id, organizationId) {
    const type = await this.repo.findById(id, organizationId);
    if (!type) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }
    return type;
  }

  async searchTypes(searchTerm, organizationId) {
    return this.repo.search(searchTerm, organizationId);
  }

  async createType(data, organizationId) {
    const { sku, name, product_type, unit } = data;
    if (!sku || !name || !product_type || !unit) {
      const err = new Error('sku, name, product_type, and unit are required');
      err.status = 400;
      throw err;
    }

    const existing = await this.repo.findBySku(sku, organizationId);
    if (existing) {
      const err = new Error('A product type with this SKU already exists in your organization');
      err.status = 409;
      throw err;
    }

    return this.repo.create({ ...data, organization_id: organizationId });
  }

  async updateType(id, data, organizationId) {
    const existing = await this.repo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    // If SKU is being changed, check for conflicts
    if (data.sku && data.sku !== existing.sku) {
      const conflict = await this.repo.findBySku(data.sku, organizationId);
      if (conflict) {
        const err = new Error('A product type with this SKU already exists in your organization');
        err.status = 409;
        throw err;
      }
    }

    return this.repo.update(id, data, 'product_type_id');
  }

  async deleteType(id, organizationId) {
    const existing = await this.repo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    // Check for associated lots — return 409 with count (not a generic FK error)
    const { data: lots, error: lotsError } = await this.repo.client
      .from('product_lots')
      .select('lot_id', { count: 'exact', head: true })
      .eq('product_type_id', id)
      .eq('organization_id', organizationId);
    const lotCount = lotsError ? 0 : (lots?.length ?? 0);
    if (lotCount > 0) {
      const err = new Error(`Cannot delete product type: ${lotCount} lot(s) are still associated`);
      err.status = 409;
      err.lot_count = lotCount;
      throw err;
    }

    await this.repo.delete(id, 'product_type_id');
    return true;
  }
}

module.exports = { ProductTypeService };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/services/ProductTypeService.unit.test.js --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/ProductTypeService.js backend/tests/unit/services/ProductTypeService.unit.test.js
git commit -m "feat: add ProductTypeService with SKU uniqueness validation"
```

---

## Task 6: ProductLotService with FEFO

**Files:**
- Create: `backend/services/ProductLotService.js`
- Test: `backend/tests/unit/services/ProductLotService.unit.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// backend/tests/unit/services/ProductLotService.unit.test.js
const { ProductLotService } = require('../../../services/ProductLotService');

describe('ProductLotService', () => {
  let service;
  let mockLotRepo;
  let mockTypeRepo;
  let mockStockMovementRepo;
  let mockWarehouseRepo;
  let mockLogger;

  beforeEach(() => {
    mockLotRepo = {
      findByType: jest.fn(),
      findById: jest.fn(),
      findByLotNumber: jest.fn(),
      findForFefo: jest.fn(),
      findExpiringByOrg: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockTypeRepo = { findById: jest.fn() };
    mockStockMovementRepo = { getCurrentStock: jest.fn() };
    mockWarehouseRepo = { findByOrganizationId: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    service = new ProductLotService(mockLotRepo, mockTypeRepo, mockStockMovementRepo, mockWarehouseRepo, mockLogger);
  });

  describe('fefoAssignLot', () => {
    test('returns earliest non-expired lot with sufficient stock', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
        { lot_id: 'lot-2', expiration_date: '2026-12-01' },
      ]);
      mockStockMovementRepo.getCurrentStock
        .mockResolvedValueOnce(10)  // lot-1 has 10
        .mockResolvedValueOnce(20); // lot-2 has 20
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1');
      expect(result.lot_id).toBe('lot-1');
      expect(result.partial).toBe(false);
    });

    test('skips lots with insufficient stock and picks next', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
        { lot_id: 'lot-2', expiration_date: '2026-12-01' },
      ]);
      mockStockMovementRepo.getCurrentStock
        .mockResolvedValueOnce(2)   // lot-1 only has 2 (not enough for 5)
        .mockResolvedValueOnce(20); // lot-2 has 20
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1');
      expect(result.lot_id).toBe('lot-2');
    });

    test('returns partial flag when no lot has enough', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([
        { lot_id: 'lot-1', expiration_date: '2026-06-01' },
      ]);
      mockStockMovementRepo.getCurrentStock.mockResolvedValue(2);
      const result = await service.fefoAssignLot('pt-1', 'wh-1', 10, 'org-1');
      expect(result.partial).toBe(true);
      expect(result.lot_id).toBe('lot-1'); // still returns earliest available
    });

    test('throws 422 when no lots available at all', async () => {
      mockLotRepo.findForFefo.mockResolvedValue([]);
      await expect(service.fefoAssignLot('pt-1', 'wh-1', 5, 'org-1'))
        .rejects.toMatchObject({ status: 422 });
    });
  });

  describe('createLot', () => {
    test('throws when lot_number already exists in org', async () => {
      mockTypeRepo.findById.mockResolvedValue({ product_type_id: 'pt-1' });
      mockLotRepo.findByLotNumber.mockResolvedValue({ lot_id: 'existing' });
      await expect(service.createLot({ lot_number: 'LOT-001', expiration_date: '2027-01-01', price: 100 }, 'pt-1', 'org-1'))
        .rejects.toMatchObject({ status: 409 });
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/services/ProductLotService.unit.test.js --no-coverage
```

- [ ] **Step 3: Write the implementation**

```js
// backend/services/ProductLotService.js
const { Logger } = require('../utils/Logger');

class ProductLotService {
  constructor(productLotRepository, productTypeRepository, stockMovementRepository, warehouseRepository, logger) {
    this.lotRepo = productLotRepository;
    this.typeRepo = productTypeRepository;
    this.stockRepo = stockMovementRepository;
    this.warehouseRepo = warehouseRepository;
    this.logger = logger || new Logger('ProductLotService');
  }

  async getLotsByType(productTypeId, organizationId, options = {}) {
    return this.lotRepo.findByType(productTypeId, organizationId, options);
  }

  async getLotById(id, organizationId) {
    const lot = await this.lotRepo.findById(id, organizationId);
    if (!lot) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    return lot;
  }

  async createLot(data, productTypeId, organizationId) {
    const { lot_number, expiration_date, price } = data;
    if (!lot_number || !expiration_date || price == null) {
      const err = new Error('lot_number, expiration_date, and price are required');
      err.status = 400;
      throw err;
    }

    const type = await this.typeRepo.findById(productTypeId, organizationId);
    if (!type) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    const existing = await this.lotRepo.findByLotNumber(lot_number, organizationId);
    if (existing) {
      const err = new Error('A lot with this lot number already exists in your organization');
      err.status = 409;
      throw err;
    }

    return this.lotRepo.create({ ...data, product_type_id: productTypeId, organization_id: organizationId });
  }

  async updateLot(id, data, organizationId) {
    const existing = await this.lotRepo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    return this.lotRepo.update(id, data, 'lot_id');
  }

  async deleteLot(id, organizationId) {
    const existing = await this.lotRepo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product lot not found');
      err.status = 404;
      throw err;
    }
    await this.lotRepo.delete(id, 'lot_id');
    return true;
  }

  /**
   * Find the best lot to use for a given product type and quantity (FEFO algorithm).
   * Only considers non-expired lots with stock in the target warehouse.
   * @returns {{ lot_id, available_stock, quantity_needed, partial }}
   */
  async fefoAssignLot(productTypeId, warehouseId, quantityNeeded, organizationId) {
    const lots = await this.lotRepo.findForFefo(productTypeId, warehouseId, organizationId);

    if (lots.length === 0) {
      const err = new Error('No available lots for this product type');
      err.status = 422;
      err.code = 'no_lot_available';
      throw err;
    }

    for (const lot of lots) {
      const stock = await this.stockRepo.getCurrentStock(lot.lot_id, warehouseId, organizationId);
      if (stock > 0 && stock >= quantityNeeded) {
        return { lot_id: lot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: false };
      }
    }

    // No single lot has enough — return earliest with partial flag
    const firstLot = lots[0];
    const stock = await this.stockRepo.getCurrentStock(firstLot.lot_id, warehouseId, organizationId);
    return { lot_id: firstLot.lot_id, available_stock: stock, quantity_needed: quantityNeeded, partial: true };
  }

  async bulkImport(rows, userId, organizationId) {
    const warehouses = await this.warehouseRepo.findByOrganizationId(organizationId);
    const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase().trim(), w.warehouse_id]));

    let created = 0, updated = 0;
    const failed = [], stock_skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Upsert product type by SKU
        let type = await this.typeRepo.findBySku ? await this.typeRepo.findBySku(row.sku, organizationId) : null;
        // Note: typeRepo needs findBySku — ensure ProductTypeRepository is injected
        if (!type) {
          type = await this.typeRepo.create({
            sku: row.sku,
            name: row.name,
            product_type: row.product_type,
            unit: row.unit,
            description: row.description || null,
            organization_id: organizationId,
          });
        }

        // Upsert product lot by lot_number
        const existingLot = await this.lotRepo.findByLotNumber(row.lot_number, organizationId);
        let lot;
        if (existingLot) {
          lot = await this.lotRepo.update(existingLot.lot_id, {
            expiration_date: row.expiration_date,
            price: parseFloat(row.price),
            origin_country: row.origin_country,
          }, 'lot_id');
          updated++;
        } else {
          lot = await this.lotRepo.create({
            lot_number: row.lot_number,
            product_type_id: type.product_type_id,
            expiration_date: row.expiration_date,
            price: parseFloat(row.price),
            origin_country: row.origin_country,
            organization_id: organizationId,
          });
          created++;
        }

        // Initial stock movement
        if (row.initial_stock && parseInt(row.initial_stock) > 0 && row.warehouse_name) {
          const warehouseId = warehouseMap.get(row.warehouse_name.toLowerCase().trim());
          if (!warehouseId) {
            stock_skipped.push({ row: rowNum, lot_number: row.lot_number, reason: `Warehouse '${row.warehouse_name}' not found` });
          } else {
            await this.stockRepo.create({
              lot_id: lot.lot_id,
              warehouse_id: warehouseId,
              organization_id: organizationId,
              movement_type: 'entry',
              quantity: parseInt(row.initial_stock),
              reference: `IMPORT-${new Date().toISOString().split('T')[0]}`,
              created_by: userId,
            });
          }
        }
      } catch (err) {
        failed.push({ row: rowNum, lot_number: row.lot_number || null, errors: [err.message] });
      }
    }

    return { created, updated, failed, stock_skipped };
  }
}

module.exports = { ProductLotService };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx jest --config jest.unit.config.js tests/unit/services/ProductLotService.unit.test.js --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/ProductLotService.js backend/tests/unit/services/ProductLotService.unit.test.js
git commit -m "feat: add ProductLotService with FEFO lot assignment"
```

---

## Task 7: ProductTypeController + Route

**Files:**
- Create: `backend/controllers/ProductTypeController.js`
- Create: `backend/routes/productTypes.js`
- Create: `backend/validations/productTypeValidation.js`

- [ ] **Step 1: Write validation schemas**

```js
// backend/validations/productTypeValidation.js
const Joi = require('joi');

const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];
const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];

const createProductTypeSchema = Joi.object({
  sku: Joi.string().max(100).required().messages({ 'any.required': 'SKU is required' }),
  name: Joi.string().max(255).required().messages({ 'any.required': 'Name is required' }),
  product_type: Joi.string().valid(...VALID_PRODUCT_TYPES).required(),
  unit: Joi.string().valid(...VALID_UNITS).required(),
  min_stock: Joi.number().min(0).optional(),
  max_stock: Joi.number().min(0).optional(),
  description: Joi.string().max(1000).optional().allow('', null),
  alert_enabled: Joi.boolean().optional(),
  senasa_product_id: Joi.string().uuid().optional().allow(null),
  branch_id: Joi.string().uuid().optional().allow(null),
});

const updateProductTypeSchema = Joi.object({
  sku: Joi.string().max(100).optional(),
  name: Joi.string().max(255).optional(),
  product_type: Joi.string().valid(...VALID_PRODUCT_TYPES).optional(),
  unit: Joi.string().valid(...VALID_UNITS).optional(),
  min_stock: Joi.number().min(0).optional(),
  max_stock: Joi.number().min(0).optional(),
  description: Joi.string().max(1000).optional().allow('', null),
  alert_enabled: Joi.boolean().optional(),
  senasa_product_id: Joi.string().uuid().optional().allow(null),
  branch_id: Joi.string().uuid().optional().allow(null),
}).min(1);

module.exports = { createProductTypeSchema, updateProductTypeSchema };
```

- [ ] **Step 2: Write the controller**

```js
// backend/controllers/ProductTypeController.js
const { Logger } = require('../utils/Logger');

class ProductTypeController {
  constructor(productTypeService) {
    this.service = productTypeService;
    this.logger = new Logger('ProductTypeController');
  }

  async getTypes(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const types = await this.service.getTypes(organizationId);
      res.json({ data: types, meta: { total: types.length, organizationId } });
    } catch (error) { next(error); }
  }

  async getTypeById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.getTypeById(id, organizationId);
      res.json({ data: type });
    } catch (error) { next(error); }
  }

  async searchTypes(req, res, next) {
    try {
      const { q } = req.query;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      if (!q) return res.status(400).json({ error: 'Search term is required' });
      const types = await this.service.searchTypes(q, organizationId);
      res.json({ data: types, meta: { searchTerm: q, total: types.length } });
    } catch (error) { next(error); }
  }

  async createType(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.createType(req.body, organizationId);
      res.status(201).json({ data: type, message: 'Product type created successfully' });
    } catch (error) { next(error); }
  }

  async updateType(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.updateType(id, req.body, organizationId);
      res.json({ data: type, message: 'Product type updated successfully' });
    } catch (error) { next(error); }
  }

  async deleteType(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      await this.service.deleteType(id, organizationId);
      res.json({ message: 'Product type deleted successfully' });
    } catch (error) { next(error); }
  }
}

module.exports = { ProductTypeController };
```

- [ ] **Step 3: Write the route**

```js
// backend/routes/productTypes.js
const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest, validateQuery } = require('../middleware/validation');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { createLimiter } = require('../middleware/rateLimiting');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');
const { createProductTypeSchema, updateProductTypeSchema } = require('../validations/productTypeValidation');

const router = express.Router();
const controller = ServiceFactory.createProductTypeController();

router.use(authenticateUser);
router.use(requireOrganizationContext);

router.get('/search', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await controller.searchTypes(req, res, next); } catch (e) { next(e); }
});

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await controller.getTypes(req, res, next); } catch (e) { next(e); }
});

router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await controller.getTypeById(req, res, next); } catch (e) { next(e); }
});

router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), checkOrganizationLimit('products'), createLimiter, validateRequest(createProductTypeSchema), async (req, res, next) => {
  try { await controller.createType(req, res, next); } catch (e) { next(e); }
});

router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), createLimiter, validateRequest(updateProductTypeSchema), async (req, res, next) => {
  try { await controller.updateType(req, res, next); } catch (e) { next(e); }
});

router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res, next) => {
  try { await controller.deleteType(req, res, next); } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 4: Run unit tests (all)**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/ProductTypeController.js backend/routes/productTypes.js backend/validations/productTypeValidation.js
git commit -m "feat: add ProductTypeController, route, and validations"
```

---

## Task 8: ProductLotController + Route

**Files:**
- Create: `backend/controllers/ProductLotController.js`
- Create: `backend/routes/productLots.js`
- Create: `backend/validations/productLotValidation.js`

- [ ] **Step 1: Write the validation schemas**

```js
// backend/validations/productLotValidation.js
const Joi = require('joi');

const createProductLotSchema = Joi.object({
  lot_number: Joi.string().max(100).required(),
  expiration_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    .messages({ 'string.pattern.base': 'expiration_date must be YYYY-MM-DD' }),
  price: Joi.number().min(0).required(),
  origin_country: Joi.string().max(100).required(),
  destination_id: Joi.string().uuid().optional().allow(null),
  external_product_id: Joi.string().max(100).optional().allow(null),
});

const updateProductLotSchema = Joi.object({
  lot_number: Joi.string().max(100).optional(),
  expiration_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  price: Joi.number().min(0).optional(),
  origin_country: Joi.string().max(100).optional(),
  destination_id: Joi.string().uuid().optional().allow(null),
  external_product_id: Joi.string().max(100).optional().allow(null),
}).min(1);

module.exports = { createProductLotSchema, updateProductLotSchema };
```

- [ ] **Step 2: Write the controller**

```js
// backend/controllers/ProductLotController.js
const { Logger } = require('../utils/Logger');

class ProductLotController {
  constructor(productLotService) {
    this.service = productLotService;
    this.logger = new Logger('ProductLotController');
  }

  async getAllLots(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lots = await this.service.lotRepo.findByOrg(organizationId);
      res.json({ data: lots, meta: { total: lots.length } });
    } catch (error) { next(error); }
  }

  async getLotsByType(req, res, next) {
    try {
      const { typeId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lots = await this.service.getLotsByType(typeId, organizationId);
      res.json({ data: lots, meta: { total: lots.length } });
    } catch (error) { next(error); }
  }

  async getLotById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.getLotById(id, organizationId);
      res.json({ data: lot });
    } catch (error) { next(error); }
  }

  async createLot(req, res, next) {
    try {
      const { typeId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.createLot(req.body, typeId, organizationId);
      res.status(201).json({ data: lot, message: 'Product lot created successfully' });
    } catch (error) { next(error); }
  }

  async updateLot(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.updateLot(id, req.body, organizationId);
      res.json({ data: lot, message: 'Product lot updated successfully' });
    } catch (error) { next(error); }
  }

  async deleteLot(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      await this.service.deleteLot(id, organizationId);
      res.json({ message: 'Product lot deleted successfully' });
    } catch (error) { next(error); }
  }

  async bulkImport(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const { products: rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'products array is required and must not be empty' });
      }
      if (rows.length > 500) {
        return res.status(400).json({ error: 'Cannot import more than 500 products at once' });
      }
      const result = await this.service.bulkImport(rows, userId, organizationId);
      res.status(200).json({
        data: result,
        message: `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed.length} failed`
      });
    } catch (error) { next(error); }
  }
}

module.exports = { ProductLotController };
```

- [ ] **Step 3: Write the routes**

```js
// backend/routes/productLots.js
const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { createLimiter, bulkImportLimiter } = require('../middleware/rateLimiting');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');
const { createProductLotSchema, updateProductLotSchema } = require('../validations/productLotValidation');

const router = express.Router({ mergeParams: true }); // mergeParams to access :typeId
const controller = ServiceFactory.createProductLotController();

router.use(authenticateUser);
router.use(requireOrganizationContext);

// GET / — handles both:
//   /api/product-types/:typeId/lots  → getLotsByType (typeId present via mergeParams)
//   /api/product-lots/               → getAllLots for org (typeId absent)
router.get('/', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try {
    if (req.params.typeId) {
      await controller.getLotsByType(req, res, next);
    } else {
      await controller.getAllLots(req, res, next); // falls back to org-wide lot list
    }
  } catch (e) { next(e); }
});

router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), checkOrganizationLimit('products'), createLimiter, validateRequest(createProductLotSchema), async (req, res, next) => {
  try { await controller.createLot(req, res, next); } catch (e) { next(e); }
});

// Standalone: /api/product-lots/:id (for direct lot access)
// This requires separate mounting in app.js — see Task 9

router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), createLimiter, validateRequest(updateProductLotSchema), async (req, res, next) => {
  try { await controller.updateLot(req, res, next); } catch (e) { next(e); }
});

router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res, next) => {
  try { await controller.deleteLot(req, res, next); } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/ProductLotController.js backend/routes/productLots.js backend/validations/productLotValidation.js
git commit -m "feat: add ProductLotController, route, and validations"
```

---

## Task 9: Update container.js

**Files:**
- Modify: `backend/config/container.js`

Read the full current `container.js` before editing. Add new registrations and a `ServiceFactory` that creates the new controllers.

- [ ] **Step 1: Add new repository registrations** (after existing repo registrations)

```js
// Add to container.js imports section:
const { ProductTypeRepository } = require('../repositories/ProductTypeRepository');
const { ProductLotRepository } = require('../repositories/ProductLotRepository');

// Add to container.js services imports:
const { ProductTypeService } = require('../services/ProductTypeService');
const { ProductLotService } = require('../services/ProductLotService');

// Add to container.js controller imports:
const { ProductTypeController } = require('../controllers/ProductTypeController');
const { ProductLotController } = require('../controllers/ProductLotController');
```

- [ ] **Step 2: Register new services in `initializeContainer()`**

Add after existing repository registrations:
```js
container.register('productTypeRepository', () => {
  const dbConfig = container.get('dbConfig');
  return new ProductTypeRepository(dbConfig.getClient());
}, true);

container.register('productLotRepository', () => {
  const dbConfig = container.get('dbConfig');
  return new ProductLotRepository(dbConfig.getClient());
}, true);
```

Add after existing service registrations:
```js
container.register('productTypeService', () => {
  const logger = container.get('logger');
  return new ProductTypeService(
    container.get('productTypeRepository'),
    logger
  );
}, true);

container.register('productLotService', () => {
  const logger = container.get('logger');
  return new ProductLotService(
    container.get('productLotRepository'),
    container.get('productTypeRepository'),
    container.get('stockMovementRepository'),
    container.get('warehouseRepository'),
    logger
  );
}, true);
```

- [ ] **Step 3: Add to `ServiceFactory`**

Find the `ServiceFactory` object at the bottom of container.js and add:
```js
createProductTypeController: () => {
  return new ProductTypeController(container.get('productTypeService'));
},
createProductLotController: () => {
  return new ProductLotController(container.get('productLotService'));
},
```

- [ ] **Step 4: Update `StockMovementService` registration** to use `productLotRepository` instead of `productRepository`

Find where `stockMovementService` is registered and update:
```js
container.register('stockMovementService', () => {
  const logger = container.get('logger');
  return new StockMovementService(
    container.get('stockMovementRepository'),
    container.get('productLotRepository'),  // ← was productRepository
    container.get('warehouseRepository'),
    logger
  );
}, true);
```

- [ ] **Step 5: Update `DashboardService` registration** to pass new repos:
```js
container.register('dashboardService', () => {
  const logger = container.get('logger');
  return new DashboardService(
    container.get('productTypeRepository'),  // ← was productRepository
    container.get('productLotRepository'),   // ← new: needed for findExpiringByOrg
    container.get('warehouseRepository'),
    container.get('stockMovementRepository'),
    logger
  );
}, true);
```

- [ ] **Step 6: Run unit tests to confirm container changes don't break existing tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add backend/config/container.js
git commit -m "feat: register ProductType and ProductLot services in container"
```

---

## Task 10: Mount New Routes + Update app.js

**Files:**
- Modify: `backend/app.js` (or wherever routes are mounted — check the file)

- [ ] **Step 1: Find where routes are mounted**

```bash
grep -n "products\|router\|app.use" backend/app.js | head -30
```

- [ ] **Step 2: Add new routes, remove old product route**

Find the line mounting `/api/products` and replace with:
```js
// Remove: app.use('/api/products', require('./routes/products'));

// Add:
const productTypeRoutes = require('./routes/productTypes');
const productLotRoutes = require('./routes/productLots');

app.use('/api/product-types', productTypeRoutes);
app.use('/api/product-types/:typeId/lots', productLotRoutes);
// Standalone lot endpoints (GET /:id, PUT /:id, DELETE /:id)
app.use('/api/product-lots', productLotRoutes);
// Note: use the SAME router instance — Express handles mergeParams per mount.
// A single require() is enough; both mounts share the same router.
```

Also add a standalone `GET /:id` to `backend/routes/productLots.js` (after the bulk-import route, before `PUT /:id`):
```js
// Add to productLots.js — standalone lot read
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await controller.getLotById(req, res, next); } catch (e) { next(e); }
});
```

- [ ] **Step 3: Run unit tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add backend/app.js
git commit -m "feat: mount product-types and product-lots routes"
```

---

## Task 11: Update ProductFormulaService

**Files:**
- Modify: `backend/services/ProductFormulaService.js`

All references to `finished_product_id` / `raw_material_id` become `finished_product_type_id` / `raw_material_type_id`. References to `product_id` in the stock query become `lot_id`.

- [ ] **Step 1: Update column references in `validateFormulaStock`**

```js
// In validateFormulaStock, change:
.eq('product_id', item.raw_material_id)
// to:
.eq('lot_id', /* need the lot_id — this method needs redesign */
```

The `validateFormulaStock` method currently looks up stock by `raw_material_id`. After migration, it needs to find stock across all lots of the raw material type. Update:

```js
async validateFormulaStock(finishedProductTypeId, quantity, warehouseId, organizationId) {
  const formula = await this.formulaRepository.findByFinishedProduct(
    finishedProductTypeId, organizationId
  );
  if (formula.length === 0) throw new Error('No formula defined for this product type');

  return Promise.all(formula.map(async (item) => {
    const required = item.quantity_required * quantity;

    // Step 1: fetch lot IDs for this raw material type (non-expired)
    const today = new Date().toISOString().split('T')[0];
    const { data: lots } = await this.supabaseClient
      .from('product_lots')
      .select('lot_id')
      .eq('product_type_id', item.raw_material_type_id)
      .eq('organization_id', organizationId)
      .gte('expiration_date', today);
    const lotIds = (lots || []).map(l => l.lot_id);

    if (lotIds.length === 0) {
      return { product_type_id: item.raw_material_type_id, quantity_required: required, current_stock: 0, sufficient: false };
    }

    // Step 2: sum stock movements for those lots in the target warehouse
    const { data: movements } = await this.supabaseClient
      .from('stock_movements')
      .select('movement_type, quantity')
      .eq('warehouse_id', warehouseId)
      .eq('organization_id', organizationId)
      .in('lot_id', lotIds);

    const currentStock = (movements || []).reduce((acc, m) => {
      if (m.movement_type === 'entry') return acc + Number(m.quantity);
      if (['exit', 'production'].includes(m.movement_type)) return acc - Number(m.quantity);
      return acc;
    }, 0);

    return {
      product_type_id: item.raw_material_type_id,
      name: item.raw_material_type?.name || item.raw_material_type_id,
      quantity_required: required,
      current_stock: currentStock,
      sufficient: currentStock >= required,
    };
  }));
}
```

Also update all other method references:
- `finishedProductId` parameter → `finishedProductTypeId`
- `_validateFinishedProduct(finishedProductId` → `_validateFinishedProductType(finishedProductTypeId`
- `_validateRawMaterial(raw_material_id` → `_validateRawMaterialType(raw_material_type_id`
- `formulaRepository.findByFinishedProduct(finishedProductId` → `(finishedProductTypeId`

- [ ] **Step 2: Update `ProductFormulaRepository` column references**

In `ProductFormulaRepository.js`, update all `finished_product_id` → `finished_product_type_id` and `raw_material_id` → `raw_material_type_id`.

- [ ] **Step 3: Run tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add backend/services/ProductFormulaService.js backend/repositories/ProductFormulaRepository.js
git commit -m "feat: update ProductFormulaService to use product_type_id"
```

---

## Task 12: Update StockMovementRepository + StockMovementService

**Files:**
- Modify: `backend/repositories/StockMovementRepository.js` — update `getCurrentStock` and `getCurrentStockBulk`
- Modify: `backend/services/StockMovementService.js`

**CRITICAL:** The FEFO algorithm calls `stockMovementRepository.getCurrentStock(lot_id, warehouseId, orgId)`. This method must filter by `lot_id` (renamed from `product_id`). If this is not updated before Task 6 runs, FEFO will always return zero stock and every FEFO call will fail.

- [ ] **Step 1: Update `StockMovementRepository` — rename `product_id` → `lot_id`**

```bash
grep -n "product_id" backend/repositories/StockMovementRepository.js
```

Find `getCurrentStock` (and `getCurrentStockBulk` if present) and replace `.eq('product_id', ...)` with `.eq('lot_id', ...)`. Example before/after:

```js
// BEFORE:
.eq('product_id', productId)

// AFTER:
.eq('lot_id', lotId)
```

Also update the method signature from `getCurrentStock(productId, warehouseId, orgId)` to `getCurrentStock(lotId, warehouseId, orgId)`.

- [ ] **Step 2: Update StockMovementService constructor**

```js
constructor(stockMovementRepository, productLotRepository, warehouseRepository, logger) {
  this.stockMovementRepository = stockMovementRepository;
  this.productLotRepository = productLotRepository;  // ← was productRepository
  this.warehouseRepository = warehouseRepository;
  this.logger = logger;
}
```

- [ ] **Step 3: Update `getOrganizationMovements`**

In the method that maps movements, update references:
```js
// Change all:
product_id: productObj?.product_id ?? movement.product_id,
product: productObj,
product_name: productObj?.name || 'Unknown Product',

// To:
lot_id: lotObj?.lot_id ?? movement.lot_id,
lot: lotObj,
lot_number: lotObj?.lot_number || 'Unknown Lot',
// For display, also resolve the type name via lot.product_types (from the join in ProductLotRepository)
```

- [ ] **Step 4: Update all other references to `product_id` → `lot_id`** in the service

Search: `grep -n "product_id\|productRepository" backend/services/StockMovementService.js`

Replace each one appropriately.

- [ ] **Step 5: Run tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add backend/repositories/StockMovementRepository.js backend/services/StockMovementService.js
git commit -m "feat: update StockMovementRepository and StockMovementService to use lot_id"
```

---

## Task 13: Update PricingService + DashboardService

**Files:**
- Modify: `backend/services/PricingService.js`
- Modify: `backend/services/DashboardService.js`

- [ ] **Step 1: Update PricingService — replace `product_id` with `product_type_id`**

```bash
grep -n "product_id" backend/services/PricingService.js
```

Replace all occurrences of `item.product_id` with `item.product_type_id` in the pricing calculation methods. The `product_tax_groups` and `customer_pricing` tables now use `product_type_id` as their FK.

- [ ] **Step 2: Update DashboardService — replace `productRepository` with `productTypeRepository` + `productLotRepository`**

```bash
grep -n "productRepository\|product_id" backend/services/DashboardService.js
```

Update:
- Constructor: add both `productTypeRepository` and `productLotRepository` parameters:
  ```js
  constructor(productTypeRepository, productLotRepository, warehouseRepository, stockMovementRepository, logger) {
    this.productTypeRepository = productTypeRepository;
    this.productLotRepository = productLotRepository;  // ← new
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.logger = logger;
  }
  ```
- `this.productRepository.count(...)` → `this.productTypeRepository.count(...)`
- `this.productRepository.findExpiringSoon(...)` → `this.productLotRepository.findExpiringByOrg(30, organizationId)`
- Movement enrichment: map from `lot_id` to lot/type name via the new repository

- [ ] **Step 3: Run all unit tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add backend/services/PricingService.js backend/services/DashboardService.js
git commit -m "feat: update PricingService and DashboardService to use product_type_id/lot_id"
```

---

## Task 14: Update OrderService

**Files:**
- Modify: `backend/services/OrderService.js`

`order_details` now has `product_type_id` (required, FK to `product_types`) + `lot_id` (nullable, FK to `product_lots`). Every place `OrderService` reads or writes `order_details.product_id` must be updated.

- [ ] **Step 1: Find all `product_id` references in OrderService**

```bash
grep -n "product_id\|productRepository\|productService" backend/services/OrderService.js
```

- [ ] **Step 2: Update `createOrder` / `addOrderDetail`**

Every place a detail row is inserted into `order_details`, replace `product_id` with `product_type_id`. Add optional `lot_id`:

```js
// BEFORE:
{ ...detail, product_id: detail.product_id, order_id: orderId }

// AFTER:
{
  ...detail,
  product_type_id: detail.product_type_id,  // required
  lot_id: detail.lot_id || null,             // optional (FEFO assigns at dispatch)
  order_id: orderId,
}
```

- [ ] **Step 3: Update `getOrderDetails` / any method that reads order details**

Where the service enriches order details with product info, update to join or look up by `product_type_id`:

```js
// BEFORE:
const product = await this.productRepository.findById(detail.product_id, orgId);

// AFTER:
const type = await this.productTypeRepository.findById(detail.product_type_id, orgId);
```

Update the `OrderService` constructor to accept `productTypeRepository` and `productLotService`:

```js
constructor(orderRepository, orderDetailRepository, productTypeRepository, productLotService, warehouseRepository, pricingService, logger) {
  this.orderRepository = orderRepository;
  this.orderDetailRepository = orderDetailRepository;
  this.productTypeRepository = productTypeRepository;  // ← was productRepository
  this.productLotService = productLotService;           // ← new: for FEFO dispatch
  // ...
}
```

- [ ] **Step 3b: Add FEFO auto-assignment at order dispatch time**

The spec requires: when `lot_id` is null on a line item at dispatch/fulfillment time (movement type `exit` or `production`), call `fefoAssignLot` to resolve the lot before creating the stock movement.

Find the method that dispatches stock movements for an order (e.g. `fulfillOrder`, `dispatchOrder`, or wherever `StockMovementService` is called per line item). Add FEFO resolution:

```js
// For each order detail line at dispatch time:
async _resolveLotsForDispatch(details, warehouseId, organizationId) {
  return Promise.all(details.map(async (detail) => {
    if (detail.lot_id) return detail; // explicit lot — use it as-is

    // FEFO auto-assign: only for exit/production movement types
    const assignment = await this.productLotService.fefoAssignLot(
      detail.product_type_id,
      warehouseId,
      detail.quantity,
      organizationId
    );

    if (assignment.partial) {
      const err = new Error(`Insufficient stock for product type ${detail.product_type_id}: available ${assignment.available_stock}, needed ${detail.quantity}`);
      err.status = 422;
      throw err;
    }

    return { ...detail, lot_id: assignment.lot_id };
  }));
}
```

Call this method before passing line items to `StockMovementService.createMovement`.

- [ ] **Step 4: Update container.js — OrderService registration**

Find the `orderService` registration in `container.js` and replace `productRepository` with `productTypeRepository` + add `productLotService`:

```js
container.register('orderService', () => {
  return new OrderService(
    container.get('orderRepository'),
    container.get('orderDetailRepository'),
    container.get('productTypeRepository'),  // ← was productRepository
    container.get('productLotService'),       // ← new: for FEFO dispatch
    container.get('warehouseRepository'),
    container.get('pricingService'),
    container.get('logger')
  );
}, true);
```

Note: `productLotService` must be registered (Task 9 Step 2) before `orderService` is registered.

- [ ] **Step 5: Run tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add backend/services/OrderService.js backend/config/container.js
git commit -m "feat: update OrderService to use product_type_id + lot_id on order_details"
```

---

## Task 15: Clean Up Removed Files

- [ ] **Step 1: Delete old product files**

```bash
rm backend/repositories/ProductRepository.js
rm backend/services/ProductService.js
rm backend/controllers/ProductController.js
rm backend/routes/products.js
rm backend/tests/unit/ProductService.unit.test.js
rm backend/tests/unit/ProductController.unit.test.js
```

- [ ] **Step 2: Run unit tests — confirm nothing breaks**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

Expected: all tests pass. If any test imports the deleted files, fix those imports.

- [ ] **Step 3: Commit**

```bash
git add -u  # stages deletions
git commit -m "chore: remove deprecated ProductRepository, ProductService, ProductController and products route"
```

---

## Task 16: Update Bulk Import Route + Validation

The bulk import endpoint moves from `POST /api/products/bulk-import` to `POST /api/product-types/bulk-import`. The CSV format now requires `sku` and `lot_number` instead of `batch_number`.

**Files:**
- Modify: `backend/routes/productTypes.js` — add bulk-import route
- Verify: `backend/controllers/ProductLotController.js` already has `bulkImport` method (added in Task 8)

- [ ] **Step 1: Add bulk-import route to `productTypes.js`**

```js
// Add to productTypes.js (before the /:id routes):
const { bulkImportLimiter } = require('../middleware/rateLimiting');

router.post(
  '/bulk-import',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  checkOrganizationLimit('products'),
  bulkImportLimiter,
  async (req, res, next) => {
    const lotController = ServiceFactory.createProductLotController();
    try { await lotController.bulkImport(req, res, next); } catch (e) { next(e); }
  }
);
```

- [ ] **Step 2: Run all tests**

```bash
cd backend && npx jest --config jest.unit.config.js --no-coverage
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/productTypes.js
git commit -m "feat: add bulk-import route under /api/product-types/bulk-import"
```

---

## Final Verification

- [ ] **Start the backend server**

```bash
cd backend && bun run dev
```

Expected: server starts on port 4000 with no errors.

- [ ] **Test key endpoints manually** (use curl or the Betali frontend)

```bash
# Should return 401 (not authenticated):
curl http://localhost:4000/api/product-types
curl http://localhost:4000/api/product-lots

# Should return 404 (old endpoint removed):
curl http://localhost:4000/api/products  # → 404
```

- [ ] **Run full unit test suite**

```bash
cd backend && npx jest --config jest.unit.config.js
```

Expected: all tests pass, coverage report generated.

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: complete product types & lots backend migration

- New product_types table (SKU catalog)
- New product_lots table (batch instances)
- ProductTypeRepository, ProductLotRepository
- ProductTypeService (SKU uniqueness validation)
- ProductLotService (FEFO lot assignment)
- ProductTypeController + Route: /api/product-types
- ProductLotController + Route: /api/product-types/:typeId/lots
- Updated ProductFormulaService, StockMovementService, PricingService, DashboardService
- Bulk import moved to POST /api/product-types/bulk-import
- Removed deprecated ProductService, ProductController, products route"
```
