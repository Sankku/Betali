-- ============================================================================
-- Migration 013: Fix stock movement reference field in order status trigger
-- ============================================================================
-- Problem: The trigger used 'Order ' || order_id (full UUID) as reference,
--          which is unreadable. Use a short 8-char uppercase suffix instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_order_detail RECORD;
  v_short_ref TEXT;
BEGIN
  -- Get organization_id for the order
  v_organization_id := get_order_organization_id(NEW.order_id);

  -- Short readable reference (last 8 chars of UUID, uppercase)
  v_short_ref := '#' || UPPER(RIGHT(NEW.order_id::TEXT, 8));

  -- Only process if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Case 1: Order moved to PROCESSING → Create stock reservations
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
      FOR v_order_detail IN
        SELECT product_id, quantity
        FROM order_details
        WHERE order_id = NEW.order_id
      LOOP
        INSERT INTO stock_reservations (
          organization_id,
          order_id,
          product_id,
          warehouse_id,
          quantity,
          status,
          reserved_at
        ) VALUES (
          v_organization_id,
          NEW.order_id,
          v_order_detail.product_id,
          NEW.warehouse_id,
          v_order_detail.quantity,
          'active',
          NOW()
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Case 2: Order moved to SHIPPED → Deduct physical stock and fulfill reservations
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
      FOR v_order_detail IN
        SELECT product_id, quantity
        FROM order_details
        WHERE order_id = NEW.order_id
      LOOP
        INSERT INTO stock_movements (
          warehouse_id,
          product_id,
          movement_type,
          quantity,
          reference,
          movement_date
        ) VALUES (
          NEW.warehouse_id,
          v_order_detail.product_id,
          'exit',
          v_order_detail.quantity,
          v_short_ref,
          NOW()
        );

        UPDATE stock_reservations
        SET status = 'fulfilled',
            released_at = NOW()
        WHERE order_id = NEW.order_id
          AND product_id = v_order_detail.product_id
          AND status = 'active';
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
        SELECT product_id, quantity
        FROM order_details
        WHERE order_id = NEW.order_id
      LOOP
        INSERT INTO stock_movements (
          warehouse_id,
          product_id,
          movement_type,
          quantity,
          reference,
          movement_date
        ) VALUES (
          NEW.warehouse_id,
          v_order_detail.product_id,
          'entry',
          v_order_detail.quantity,
          v_short_ref || ' ↩',
          NOW()
        );
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;
