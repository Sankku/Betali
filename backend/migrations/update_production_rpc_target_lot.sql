-- backend/migrations/update_production_rpc_target_lot.sql
-- Adds p_target_lot_id parameter to create_production_movement so the caller
-- can specify which lot of the finished product receives the produced stock.
-- Apply in Supabase SQL editor.

CREATE OR REPLACE FUNCTION create_production_movement(
  p_finished_product_type_id UUID,
  p_quantity_to_produce       NUMERIC,
  p_warehouse_id              UUID,
  p_organization_id           UUID,
  p_user_reference            TEXT DEFAULT NULL,
  p_target_lot_id             UUID DEFAULT NULL
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
  v_output_lot_id     UUID;
BEGIN
  v_reference := COALESCE(p_user_reference, 'PROD-' || to_char(v_movement_date, 'YYYYMMDD-HH24MISS'));

  -- 1. Verify formula exists
  IF NOT EXISTS (
    SELECT 1 FROM product_formulas
    WHERE finished_product_type_id = p_finished_product_type_id
      AND organization_id = p_organization_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No formula found for product type % in organization %',
      p_finished_product_type_id, p_organization_id;
  END IF;

  -- 2. For each raw material: FEFO selection, verify stock, debit
  FOR v_formula IN
    SELECT pf.formula_id, pf.raw_material_type_id, pf.quantity_required,
           pt.name AS raw_material_name
    FROM product_formulas pf
    JOIN product_types pt ON pt.product_type_id = pf.raw_material_type_id
    WHERE pf.finished_product_type_id = p_finished_product_type_id
      AND pf.organization_id = p_organization_id
  LOOP
    v_required := v_formula.quantity_required * p_quantity_to_produce;
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
        EXIT;
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

  -- 3. Determine output lot for finished product
  IF p_target_lot_id IS NOT NULL THEN
    -- Caller specified a target lot — validate it belongs to this product type + org
    SELECT lot_id INTO v_output_lot_id
    FROM product_lots
    WHERE lot_id = p_target_lot_id
      AND product_type_id = p_finished_product_type_id
      AND organization_id = p_organization_id;

    IF v_output_lot_id IS NULL THEN
      RAISE EXCEPTION 'Target lot % not found or does not belong to this product type', p_target_lot_id;
    END IF;
  ELSE
    -- Fallback: use most recently created lot
    SELECT lot_id INTO v_output_lot_id
    FROM product_lots
    WHERE product_type_id = p_finished_product_type_id
      AND organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_output_lot_id IS NULL THEN
      RAISE EXCEPTION 'No lot found for finished product type %. Create a lot or specify a target lot.', p_finished_product_type_id;
    END IF;
  END IF;

  -- 4. Entry movement for finished product
  INSERT INTO stock_movements (
    lot_id, warehouse_id, organization_id,
    movement_type, quantity, movement_date, reference, notes
  ) VALUES (
    v_output_lot_id, p_warehouse_id, p_organization_id,
    'entry', p_quantity_to_produce, v_movement_date, v_reference,
    'Production output: ' || v_reference
  );

  RETURN jsonb_build_object(
    'reference', v_reference,
    'finished_product_type_id', p_finished_product_type_id,
    'lot_id', v_output_lot_id,
    'quantity_produced', p_quantity_to_produce,
    'materials_consumed', v_movements
  );
END;
$$;
