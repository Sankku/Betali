-- ============================================================================
-- Migration 011: Fix advisory lock key generation in generate_purchase_order_number
-- Description: Migration 010's lock_key used substr(org_id::TEXT, 1, 16) which
--              includes UUID dashes (e.g. "4ef37216-5711-40"). Casting that with
--              the 'x' hex prefix to BIT(64) fails with:
--                "-" is not a valid hexadecimal digit
--              Fix: use hashtext(org_id::TEXT) which is designed for this purpose.
-- Created: 2026-03-18
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_purchase_order_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  next_number INTEGER;
  po_number   VARCHAR(50);
BEGIN
  -- Advisory lock per org to prevent duplicate PO numbers under concurrent inserts.
  -- hashtext returns a stable int4 from any text, safe to cast to bigint.
  PERFORM pg_advisory_xact_lock(hashtext(org_id::TEXT)::BIGINT);

  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(purchase_order_number FROM '[0-9]+$')
        AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_number
  FROM purchase_orders
  WHERE organization_id = org_id
    AND purchase_order_number ~ '^PO-[0-9]+$';

  po_number := 'PO-' || LPAD(next_number::TEXT, 6, '0');
  RETURN po_number;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Migration 011 applied: fixed advisory lock key in generate_purchase_order_number.';
END $$;
