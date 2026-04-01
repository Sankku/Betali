-- ============================================================================
-- Migration 015: Fix order status trigger for product_types/lots migration
-- ============================================================================
-- Problem: handle_order_status_change trigger references old column names:
--   - order_details.product_id → order_details.product_type_id
--   - stock_reservations.product_id → stock_reservations.lot_id
--   - stock_movements.product_id → stock_movements.lot_id
-- Fix: Update trigger to use new column names and FEFO lot lookup.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_order_detail RECORD;
  v_lot_id UUID;
BEGIN
  -- Get organization_id for the order
  v_organization_id := get_order_organization_id(NEW.order_id);

  -- Only process if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Case 1: Order moved to PROCESSING → Create stock reservations
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
      FOR v_order_detail IN
        SELECT product_type_id, quantity
        FROM order_details
        WHERE order_id = NEW.order_id
      LOOP
        -- FEFO: find earliest non-expired lot with stock for this product type
        SELECT pl.lot_id INTO v_lot_id
        FROM product_lots pl
        WHERE pl.product_type_id = v_order_detail.product_type_id
          AND pl.organization_id = v_organization_id
          AND (pl.expiration_date >= CURRENT_DATE OR pl.expiration_date IS NULL)
        ORDER BY pl.expiration_date ASC NULLS LAST
        LIMIT 1;

        IF v_lot_id IS NOT NULL THEN
          INSERT INTO stock_reservations (
            organization_id,
            order_id,
            lot_id,
            warehouse_id,
            quantity,
            status,
            reserved_at
          ) VALUES (
            v_organization_id,
            NEW.order_id,
            v_lot_id,
            NEW.warehouse_id,
            v_order_detail.quantity,
            'active',
            NOW()
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Case 2: Order moved to SHIPPED → Deduct physical stock and fulfill reservations
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
      FOR v_order_detail IN
        SELECT od.product_type_id, od.quantity,
          (
            SELECT sr.lot_id
            FROM stock_reservations sr
            WHERE sr.order_id = NEW.order_id
              AND sr.organization_id = v_organization_id
              AND sr.status = 'active'
            ORDER BY sr.reserved_at ASC
            LIMIT 1
          ) AS lot_id
        FROM order_details od
        WHERE od.order_id = NEW.order_id
      LOOP
        IF v_order_detail.lot_id IS NOT NULL THEN
          -- Create stock movement (exit/out)
          INSERT INTO stock_movements (
            warehouse_id,
            lot_id,
            movement_type,
            quantity,
            reference,
            movement_date,
            organization_id
          ) VALUES (
            NEW.warehouse_id,
            v_order_detail.lot_id,
            'exit',
            v_order_detail.quantity,
            'Order ' || NEW.order_id || ' shipped',
            NOW(),
            v_organization_id
          );

          -- Mark stock reservation as fulfilled
          UPDATE stock_reservations
          SET status = 'fulfilled',
              released_at = NOW()
          WHERE order_id = NEW.order_id
            AND lot_id = v_order_detail.lot_id
            AND status = 'active';
        END IF;
      END LOOP;
    END IF;

    -- Case 3: Order CANCELLED from PROCESSING → Release reservations
    IF NEW.status = 'cancelled' AND OLD.status = 'processing' THEN
      UPDATE stock_reservations
      SET status = 'cancelled',
          released_at = NOW()
      WHERE order_id = NEW.order_id
        AND status = 'active';
    END IF;

    -- Case 4: Order CANCELLED from SHIPPED → Restore physical stock
    IF NEW.status = 'cancelled' AND OLD.status = 'shipped' THEN
      FOR v_order_detail IN
        SELECT od.quantity,
          (
            SELECT sr.lot_id
            FROM stock_reservations sr
            WHERE sr.order_id = NEW.order_id
              AND sr.organization_id = v_organization_id
            ORDER BY sr.reserved_at ASC
            LIMIT 1
          ) AS lot_id
        FROM order_details od
        WHERE od.order_id = NEW.order_id
      LOOP
        IF v_order_detail.lot_id IS NOT NULL THEN
          INSERT INTO stock_movements (
            warehouse_id,
            lot_id,
            movement_type,
            quantity,
            reference,
            movement_date,
            organization_id
          ) VALUES (
            NEW.warehouse_id,
            v_order_detail.lot_id,
            'entry',
            v_order_detail.quantity,
            'Order ' || NEW.order_id || ' cancelled - stock restored',
            NOW(),
            v_organization_id
          );
        END IF;
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_order_status_change IS 'Automatically manages stock reservations and movements when order status changes. Updated for product_types/lots schema (lot_id replaces product_id).';
