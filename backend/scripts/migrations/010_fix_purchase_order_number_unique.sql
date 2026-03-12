-- ============================================================================
-- Migration 010: Fix purchase_order_number uniqueness constraint
-- Description: The original UNIQUE(purchase_order_number) was global across
--              all organizations. Since PO numbers are sequential per-org
--              (PO-000001, PO-000002, ...), two different organizations will
--              always collide on their first order. Changed to a composite
--              unique constraint on (organization_id, purchase_order_number).
--
--              Also adds a LOCK inside generate_purchase_order_number() to
--              prevent race conditions when two requests for the same org
--              arrive simultaneously.
-- Created: 2026-02-22
-- ============================================================================

-- 1. Drop the old global unique constraint
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_number_key;

-- 2. Add the correct per-organization unique constraint
--    NULL values are excluded from unique constraints, so NULL PO numbers
--    (before the trigger fires) are still allowed.
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_number_org_key
    UNIQUE (organization_id, purchase_order_number);

-- 3. Replace the PO number generator with a version that uses advisory
--    locking to prevent duplicate numbers under concurrent inserts.
CREATE OR REPLACE FUNCTION generate_purchase_order_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  next_number INTEGER;
  po_number   VARCHAR(50);
  lock_key    BIGINT;
BEGIN
  -- Use a stable per-org advisory lock so concurrent inserts for the same
  -- org wait their turn rather than both reading the same MAX.
  lock_key := ('x' || substr(org_id::TEXT, 1, 16))::BIT(64)::BIGINT;
  PERFORM pg_advisory_xact_lock(lock_key);

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

-- 4. Notify
DO $$
BEGIN
  RAISE NOTICE 'Migration 010 applied: purchase_order_number uniqueness is now scoped per organization.';
END $$;
