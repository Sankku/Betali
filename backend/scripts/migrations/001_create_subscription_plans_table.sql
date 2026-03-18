-- Migration: Create subscription_plans table
-- Date: 2025-11-05
-- Description: Core subscription plans definition for Betali SaaS

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Plan Info
  name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'starter', 'professional', 'enterprise'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Limits
  max_users INTEGER,
  max_products INTEGER,
  max_warehouses INTEGER,
  max_stock_movements_per_month INTEGER,
  max_orders_per_month INTEGER,
  max_clients INTEGER,
  max_suppliers INTEGER,
  max_storage_mb INTEGER,

  -- Features (JSONB for flexibility)
  features JSONB DEFAULT '{}',
  -- Example: {
  --   "api_access": true,
  --   "advanced_analytics": true,
  --   "custom_reports": true,
  --   "audit_logs": false,
  --   "sso": false,
  --   "priority_support": true
  -- }

  -- Trial
  trial_days INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- shown on pricing page
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, is_public);

-- Seed initial plan data
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_products,
  max_warehouses,
  max_stock_movements_per_month,
  max_orders_per_month,
  max_clients,
  max_suppliers,
  max_storage_mb,
  trial_days,
  features,
  sort_order
) VALUES
  (
    'free',
    'Free',
    'Perfect for getting started with basic inventory management',
    0,
    0,
    1,
    50,
    1,
    100,
    20,
    10,
    5,
    100,
    0,
    '{"api_access": false, "advanced_analytics": false, "custom_reports": false, "audit_logs": false, "sso": false, "priority_support": false}'::jsonb,
    1
  ),
  (
    'starter',
    'Starter',
    'Ideal for small businesses looking to scale',
    39999,
    389999,
    3,
    500,
    2,
    1000,
    200,
    100,
    50,
    1024,
    14,
    '{"api_access": false, "advanced_analytics": false, "custom_reports": false, "audit_logs": false, "sso": false, "priority_support": false}'::jsonb,
    2
  ),
  (
    'professional',
    'Professional',
    'Advanced features for growing businesses',
    109999,
    1049999,
    10,
    5000,
    10,
    10000,
    2000,
    1000,
    500,
    10240,
    14,
    '{"api_access": true, "advanced_analytics": true, "custom_reports": true, "audit_logs": false, "sso": false, "priority_support": true}'::jsonb,
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'Complete solution for large organizations',
    279999,
    2699999,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    102400,
    30,
    '{"api_access": true, "advanced_analytics": true, "custom_reports": true, "audit_logs": true, "sso": true, "priority_support": true, "dedicated_support": true}'::jsonb,
    4
  )
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions with pricing and limits';
COMMENT ON COLUMN subscription_plans.max_users IS '-1 means unlimited';
COMMENT ON COLUMN subscription_plans.features IS 'JSON object with feature flags';
