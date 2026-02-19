-- ============================================================================
-- Migration 008: Order Status Change Triggers for Stock Management
-- ============================================================================
-- Purpose: Automatically handle stock reservations and movements when order status changes
-- Author: Betali Development Team
-- Date: 2026-01-22
-- ============================================================================

-- ============================================================================
-- Helper Function: Get organization_id from order
-- ============================================================================
CREATE OR REPLACE FUNCTION get_order_organization_id(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_org_id UUID;
  v_client_id UUID;
BEGIN
  -- Get client_id from order
  SELECT client_id INTO v_client_id
  FROM orders
  WHERE order_id = p_order_id;

  -- Get organization_id from client
  SELECT organization_id INTO v_org_id
  FROM clients
  WHERE client_id = v_client_id;

  RETURN v_org_id;
END;
$$;

-- ============================================================================
-- Trigger Function: Handle order status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_order_detail RECORD;
BEGIN
  -- Get organization_id for the order
  v_organization_id := get_order_organization_id(NEW.order_id);

  -- Only process if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Case 1: Order moved to PROCESSING → Create stock reservations
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
      -- For each order detail, create a stock reservation
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
        ON CONFLICT DO NOTHING; -- Prevent duplicates if already exists
      END LOOP;
    END IF;

    -- Case 2: Order moved to SHIPPED → Deduct physical stock and fulfill reservations
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
      -- For each order detail, create stock movement (exit) and mark reservation as fulfilled
      FOR v_order_detail IN
        SELECT product_id, quantity
        FROM order_details
        WHERE order_id = NEW.order_id
      LOOP
        -- Create stock movement (exit/out)
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
          'Order ' || NEW.order_id || ' shipped',
          NOW()
        );

        -- Mark stock reservation as fulfilled
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
      -- For each order detail, create stock movement (entry/in) to restore stock
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
          'Order ' || NEW.order_id || ' cancelled - stock restored',
          NOW()
        );
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create Trigger
-- ============================================================================
DROP TRIGGER IF EXISTS trg_order_status_change ON orders;

CREATE TRIGGER trg_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_order_status_change();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON FUNCTION handle_order_status_change IS 'Automatically manages stock reservations and movements when order status changes';
COMMENT ON TRIGGER trg_order_status_change ON orders IS 'Triggers stock management operations when order status changes';
