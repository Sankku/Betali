-- ============================================================================
-- Migration 006: Stock Reservations System
-- ============================================================================
-- Purpose: Track stock reservations for pending/processing orders
-- Author: Betali Development Team
-- Date: 2025-12-06
-- ============================================================================

-- Create stock_reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouse(warehouse_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_release_date CHECK (released_at IS NULL OR released_at >= reserved_at),
  CONSTRAINT valid_status_release CHECK (
    (status = 'active' AND released_at IS NULL) OR
    (status IN ('fulfilled', 'cancelled', 'expired') AND released_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_reservations_organization
  ON stock_reservations(organization_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_order
  ON stock_reservations(order_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_product
  ON stock_reservations(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_warehouse
  ON stock_reservations(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_status
  ON stock_reservations(status);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_active
  ON stock_reservations(organization_id, product_id, warehouse_id, status)
  WHERE status = 'active';

-- Composite index for quick lookups of active reservations by product
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_active
  ON stock_reservations(product_id, warehouse_id)
  WHERE status = 'active';

-- ============================================================================
-- Helper function: Get total reserved quantity for a product
-- ============================================================================
CREATE OR REPLACE FUNCTION get_reserved_stock(
  p_product_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_reserved_qty INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_reserved_qty
  FROM stock_reservations
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

  RETURN v_reserved_qty;
END;
$$;

-- ============================================================================
-- Helper function: Get available stock (physical stock - reserved stock)
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
  -- Get physical stock from stock_movements or warehouse inventory
  -- Note: This assumes you have a view or table tracking current stock levels
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type = 'in' THEN quantity
      WHEN movement_type = 'out' THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO v_physical_stock
  FROM stock_movements
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND organization_id = p_organization_id;

  -- Get reserved stock
  v_reserved_stock := get_reserved_stock(p_product_id, p_warehouse_id, p_organization_id);

  -- Calculate available stock
  v_available_stock := v_physical_stock - v_reserved_stock;

  -- Ensure we don't return negative available stock
  RETURN GREATEST(v_available_stock, 0);
END;
$$;

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_stock_reservations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_reservations_updated_at
  BEFORE UPDATE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_reservations_updated_at();

-- ============================================================================
-- Trigger: Auto-set released_at when status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_released_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status is changing from 'active' to something else, set released_at
  IF OLD.status = 'active' AND NEW.status IN ('fulfilled', 'cancelled', 'expired') THEN
    IF NEW.released_at IS NULL THEN
      NEW.released_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_set_released_at
  BEFORE UPDATE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_released_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see reservations from their organization
CREATE POLICY stock_reservations_organization_isolation ON stock_reservations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE stock_reservations IS 'Tracks stock reservations for pending/processing orders to prevent overselling';
COMMENT ON COLUMN stock_reservations.reservation_id IS 'Primary key';
COMMENT ON COLUMN stock_reservations.organization_id IS 'Multi-tenant organization ID';
COMMENT ON COLUMN stock_reservations.order_id IS 'Reference to the order that created this reservation';
COMMENT ON COLUMN stock_reservations.product_id IS 'Product being reserved';
COMMENT ON COLUMN stock_reservations.warehouse_id IS 'Warehouse where stock is reserved (nullable for org-wide reservations)';
COMMENT ON COLUMN stock_reservations.quantity IS 'Quantity of stock reserved';
COMMENT ON COLUMN stock_reservations.reserved_at IS 'When the reservation was created';
COMMENT ON COLUMN stock_reservations.released_at IS 'When the reservation was released (fulfilled/cancelled)';
COMMENT ON COLUMN stock_reservations.status IS 'Reservation status: active, fulfilled, cancelled, expired';
COMMENT ON FUNCTION get_reserved_stock IS 'Calculate total reserved quantity for a product';
COMMENT ON FUNCTION get_available_stock IS 'Calculate available stock (physical - reserved)';

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION get_reserved_stock TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_stock TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds:
-- 1. stock_reservations table with proper constraints
-- 2. Indexes for performance optimization
-- 3. Helper functions for stock calculations
-- 4. Triggers for automatic timestamp and status management
-- 5. Row Level Security for multi-tenant isolation
-- 6. Comprehensive documentation
-- ============================================================================
