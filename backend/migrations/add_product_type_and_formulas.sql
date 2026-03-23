-- Migration: Add BOM (Bill of Materials) support
-- Adds product_type column, product_formulas table, production stock movement type,
-- and create_production_movement RPC function.

-- ============================================================
-- 1. Add product_type column to products table
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) NOT NULL DEFAULT 'standard'
  CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'raw_material', 'finished_good'));

-- ============================================================
-- 2. Create product_formulas table
-- ============================================================

CREATE TABLE IF NOT EXISTS product_formulas (
  formula_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id  UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  raw_material_id      UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity_required    NUMERIC(10,4) NOT NULL CHECK (quantity_required > 0),
  organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(finished_product_id, raw_material_id)
);

ALTER TABLE product_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_isolation" ON product_formulas
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Update stock_movements constraint to allow 'production' type
-- ============================================================

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'compliance', 'production'));

-- ============================================================
-- 4. Create Supabase RPC create_production_movement
-- ============================================================

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
  v_required       NUMERIC;
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
    v_required := v_formula.quantity_required * p_quantity_to_produce;

    -- Check current stock in warehouse (sum of entries minus exits/productions)
    SELECT COALESCE(SUM(
      CASE
        WHEN movement_type = 'entry' THEN quantity
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

    -- Insert exit movement for this raw material
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
