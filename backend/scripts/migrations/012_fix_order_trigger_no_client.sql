-- ============================================================================
-- Migration 012: Fix order status trigger to not require client_id
-- ============================================================================
-- Problem: get_order_organization_id derived organization_id through client_id.
--          If an order had no client, v_organization_id was NULL, causing a
--          NOT NULL constraint violation when inserting into stock_reservations.
-- Fix: Read organization_id directly from the orders table.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_order_organization_id(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM orders
  WHERE order_id = p_order_id;

  RETURN v_org_id;
END;
$$;
