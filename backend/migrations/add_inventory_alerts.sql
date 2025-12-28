-- =====================================================
-- Migration: Add Inventory Alerts System
-- Description: Adds tables and fields for inventory alerts
-- Date: 2025-12-13
-- =====================================================

-- 1. Add min_stock field to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alert_enabled boolean DEFAULT true;

COMMENT ON COLUMN products.min_stock IS 'Minimum stock level before triggering low stock alert';
COMMENT ON COLUMN products.max_stock IS 'Maximum stock level for overstock alerts (optional)';
COMMENT ON COLUMN products.alert_enabled IS 'Whether to send alerts for this product';

-- 2. Create inventory_alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouse(warehouse_id) ON DELETE CASCADE,

  -- Alert details
  alert_type varchar(50) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring_soon')),
  severity varchar(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),

  -- Stock information at time of alert
  current_stock integer NOT NULL,
  min_stock integer,
  max_stock integer,

  -- Alert metadata
  message text NOT NULL,
  triggered_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp,
  dismissed_at timestamp,
  dismissed_by uuid REFERENCES users(user_id),

  -- Additional context
  metadata jsonb DEFAULT '{}',

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_organization ON inventory_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_warehouse ON inventory_alerts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_status ON inventory_alerts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity ON inventory_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_triggered_at ON inventory_alerts(triggered_at DESC);

COMMENT ON TABLE inventory_alerts IS 'Stores inventory alert notifications for products';
COMMENT ON COLUMN inventory_alerts.alert_type IS 'Type of alert: low_stock, out_of_stock, overstock, expiring_soon';
COMMENT ON COLUMN inventory_alerts.severity IS 'Alert severity level';
COMMENT ON COLUMN inventory_alerts.status IS 'Alert status: active, resolved, dismissed';

-- 3. Create alert_settings table for organization-wide settings
CREATE TABLE IF NOT EXISTS alert_settings (
  setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Global alert settings
  enable_low_stock_alerts boolean DEFAULT true,
  enable_out_of_stock_alerts boolean DEFAULT true,
  enable_overstock_alerts boolean DEFAULT false,
  enable_expiring_soon_alerts boolean DEFAULT true,

  -- Notification preferences
  email_notifications boolean DEFAULT true,
  in_app_notifications boolean DEFAULT true,
  notification_emails jsonb DEFAULT '[]', -- Array of emails to notify

  -- Alert thresholds
  expiring_soon_days integer DEFAULT 30, -- Days before expiration to alert
  low_stock_percentage integer DEFAULT 20, -- Alert when stock is below X% of min_stock

  -- Check frequency
  check_interval_minutes integer DEFAULT 60, -- How often to check for alerts
  last_check_at timestamp,

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_settings_organization ON alert_settings(organization_id);

COMMENT ON TABLE alert_settings IS 'Organization-wide settings for inventory alerts';

-- 4. Create function to calculate current stock for a product in a warehouse
CREATE OR REPLACE FUNCTION get_product_stock(
  p_product_id uuid,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  total_stock integer;
BEGIN
  -- Sum all stock movements for the product
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('IN', 'ADJUSTMENT_IN') THEN quantity
      WHEN movement_type IN ('OUT', 'ADJUSTMENT_OUT') THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO total_stock
  FROM stock_movements
  WHERE product_id = p_product_id
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);

  RETURN total_stock;
END;
$$;

COMMENT ON FUNCTION get_product_stock IS 'Calculate current stock for a product in a specific warehouse or all warehouses';

-- 5. Create function to check and create alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts(
  p_organization_id uuid
)
RETURNS TABLE (
  alert_id uuid,
  product_id uuid,
  product_name varchar,
  warehouse_id uuid,
  warehouse_name varchar,
  alert_type varchar,
  severity varchar,
  current_stock integer,
  min_stock integer,
  message text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for low stock and out of stock alerts
  RETURN QUERY
  WITH product_stocks AS (
    SELECT
      p.product_id,
      p.name as product_name,
      p.organization_id,
      p.min_stock,
      p.max_stock,
      p.alert_enabled,
      w.warehouse_id,
      w.name as warehouse_name,
      get_product_stock(p.product_id, w.warehouse_id) as current_stock
    FROM products p
    CROSS JOIN warehouse w
    WHERE p.organization_id = p_organization_id
      AND w.organization_id = p_organization_id
      AND w.is_active = true
      AND p.alert_enabled = true
  ),
  new_alerts AS (
    INSERT INTO inventory_alerts (
      organization_id,
      product_id,
      warehouse_id,
      alert_type,
      severity,
      current_stock,
      min_stock,
      max_stock,
      message,
      status
    )
    SELECT
      ps.organization_id,
      ps.product_id,
      ps.warehouse_id,
      CASE
        WHEN ps.current_stock = 0 THEN 'out_of_stock'
        WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
        WHEN ps.max_stock IS NOT NULL AND ps.current_stock >= ps.max_stock THEN 'overstock'
      END as alert_type,
      CASE
        WHEN ps.current_stock = 0 THEN 'critical'
        WHEN ps.current_stock <= (ps.min_stock * 0.5) THEN 'high'
        WHEN ps.current_stock <= ps.min_stock THEN 'medium'
        ELSE 'low'
      END as severity,
      ps.current_stock,
      ps.min_stock,
      ps.max_stock,
      CASE
        WHEN ps.current_stock = 0 THEN
          format('Product "%s" is out of stock in warehouse "%s"', ps.product_name, ps.warehouse_name)
        WHEN ps.current_stock <= ps.min_stock THEN
          format('Product "%s" is running low in warehouse "%s". Current: %s, Minimum: %s',
                 ps.product_name, ps.warehouse_name, ps.current_stock, ps.min_stock)
        WHEN ps.max_stock IS NOT NULL AND ps.current_stock >= ps.max_stock THEN
          format('Product "%s" is overstocked in warehouse "%s". Current: %s, Maximum: %s',
                 ps.product_name, ps.warehouse_name, ps.current_stock, ps.max_stock)
      END as message,
      'active' as status
    FROM product_stocks ps
    WHERE
      (ps.current_stock = 0 OR
       ps.current_stock <= ps.min_stock OR
       (ps.max_stock IS NOT NULL AND ps.current_stock >= ps.max_stock))
      AND NOT EXISTS (
        -- Don't create duplicate active alerts
        SELECT 1 FROM inventory_alerts ia
        WHERE ia.product_id = ps.product_id
          AND ia.warehouse_id = ps.warehouse_id
          AND ia.alert_type IN ('low_stock', 'out_of_stock', 'overstock')
          AND ia.status = 'active'
      )
    RETURNING *
  )
  SELECT
    na.alert_id,
    na.product_id,
    p.name as product_name,
    na.warehouse_id,
    w.name as warehouse_name,
    na.alert_type,
    na.severity,
    na.current_stock,
    na.min_stock,
    na.message
  FROM new_alerts na
  JOIN products p ON p.product_id = na.product_id
  JOIN warehouse w ON w.warehouse_id = na.warehouse_id;
END;
$$;

COMMENT ON FUNCTION check_inventory_alerts IS 'Check inventory levels and create alerts for low/out of stock products';

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_alerts_updated_at
  BEFORE UPDATE ON inventory_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_alerts_updated_at();

CREATE TRIGGER trigger_update_alert_settings_updated_at
  BEFORE UPDATE ON alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_alerts_updated_at();

-- 7. Create default alert settings for existing organizations
INSERT INTO alert_settings (organization_id)
SELECT organization_id
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM alert_settings WHERE alert_settings.organization_id = organizations.organization_id
)
ON CONFLICT (organization_id) DO NOTHING;

-- 8. Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON inventory_alerts TO authenticated;
-- GRANT SELECT, UPDATE ON alert_settings TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
