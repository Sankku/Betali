-- Migration: Fix Inventory Alerts Logic
-- Date: 2025-12-24
-- Description: Updates check_inventory_alerts to only trigger when min_stock > 0 and resolves stale alerts

BEGIN;

-- 1. Update check_inventory_alerts function
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
  -- ONLY if min_stock > 0 (prevents alerts for unconfigured products or default 0 stock)
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
      AND p.min_stock > 0 -- KEY CHANGE: Only alert if a threshold is set
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

-- 2. Cleanup function to resolve stale alerts (alerts that shouldn't exist because min_stock=0 or stock recovered)
CREATE OR REPLACE FUNCTION resolve_stale_alerts(
  p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_count integer;
BEGIN
  WITH resolved_updates AS (
    UPDATE inventory_alerts ia
    SET
      status = 'resolved',
      resolved_at = now(),
      updated_at = now()
    FROM products p, warehouse w
    WHERE ia.product_id = p.product_id
      AND ia.warehouse_id = w.warehouse_id
      AND ia.organization_id = p_organization_id
      AND ia.status = 'active'
      AND (
         -- Condition 1: min_stock is 0 (alerts shouldn't exist)
         p.min_stock = 0
         OR
         p.alert_enabled = false
         OR
         -- Condition 2: Stock has recovered (above min_stock)
         get_product_stock(p.product_id, w.warehouse_id) > p.min_stock
      )
    RETURNING ia.alert_id
  )
  SELECT count(*) INTO resolved_count FROM resolved_updates;

  RETURN resolved_count;
END;
$$;

COMMIT;
