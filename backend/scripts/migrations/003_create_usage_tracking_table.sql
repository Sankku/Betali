-- Migration: Create usage_tracking table
-- Date: 2025-11-05
-- Description: Track monthly resource usage per organization

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Period (monthly tracking)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Usage Counters
  users_count INTEGER DEFAULT 0,
  products_count INTEGER DEFAULT 0,
  warehouses_count INTEGER DEFAULT 0,
  stock_movements_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  clients_count INTEGER DEFAULT 0,
  suppliers_count INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,

  -- API Usage (for future)
  api_calls_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, period_start),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_organization_period ON usage_tracking(organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_tracking(period_start, period_end);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_tracking_updated_at();

-- Function to get or create current period usage
CREATE OR REPLACE FUNCTION get_or_create_current_usage(org_id UUID)
RETURNS usage_tracking AS $$
DECLARE
  current_period_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  current_period_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  usage_record usage_tracking;
BEGIN
  -- Try to get existing record
  SELECT * INTO usage_record
  FROM usage_tracking
  WHERE organization_id = org_id
    AND period_start = current_period_start;

  -- If not found, create new record
  IF NOT FOUND THEN
    INSERT INTO usage_tracking (
      organization_id,
      period_start,
      period_end,
      users_count,
      products_count,
      warehouses_count,
      stock_movements_count,
      orders_count,
      clients_count,
      suppliers_count,
      storage_used_mb,
      api_calls_count
    ) VALUES (
      org_id,
      current_period_start,
      current_period_end,
      0, 0, 0, 0, 0, 0, 0, 0, 0
    )
    RETURNING * INTO usage_record;
  END IF;

  RETURN usage_record;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  org_id UUID,
  counter_name VARCHAR,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  current_period_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  current_period_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  sql_query TEXT;
BEGIN
  -- Ensure usage record exists for current period
  INSERT INTO usage_tracking (organization_id, period_start, period_end)
  VALUES (org_id, current_period_start, current_period_end)
  ON CONFLICT (organization_id, period_start) DO NOTHING;

  -- Build dynamic SQL for updating the specific counter
  sql_query := format(
    'UPDATE usage_tracking SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE organization_id = $2 AND period_start = $3',
    counter_name, counter_name
  );

  -- Execute the update
  EXECUTE sql_query USING increment_by, org_id, current_period_start;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE usage_tracking IS 'Monthly resource usage tracking per organization';
COMMENT ON FUNCTION get_or_create_current_usage IS 'Gets or creates usage record for current month';
COMMENT ON FUNCTION increment_usage IS 'Increments a specific usage counter for current month';
