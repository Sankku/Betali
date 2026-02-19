-- ============================================================================
-- Migration 009: Fix get_available_stock Function
-- ============================================================================
-- Purpose: Fix movement_type values and allow negative stock
-- Author: Betali Development Team
-- Date: 2026-01-22
-- ============================================================================

-- ============================================================================
-- Update: Fix get_available_stock to use correct movement types and allow negative values
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_stock(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_physical_stock INTEGER;
  v_reserved_stock INTEGER;
  v_available_stock INTEGER;
BEGIN
  -- Get physical stock from stock_movements
  -- Using 'entry' and 'exit' as movement types (not 'in' and 'out')
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type = 'entry' THEN quantity
      WHEN movement_type = 'exit' THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO v_physical_stock
  FROM stock_movements
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id;

  -- Get reserved stock
  v_reserved_stock := get_reserved_stock(p_product_id, p_warehouse_id, p_organization_id);

  -- Calculate available stock (can be negative if over-reserved)
  v_available_stock := v_physical_stock - v_reserved_stock;

  -- Return the actual value (including negative values)
  -- This allows us to detect over-reservation scenarios
  RETURN v_available_stock;
END;
$$;

-- ============================================================================
-- Comment
-- ============================================================================
COMMENT ON FUNCTION get_available_stock IS 'Calculate available stock (physical - reserved). Can return negative values if over-reserved.';
