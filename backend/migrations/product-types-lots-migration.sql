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
  senasa_product_id UUID, -- FK omitted: senasa_products lacks a unique constraint on senasa_product_id
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
