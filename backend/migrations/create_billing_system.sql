-- Migration: Create Manual Billing System
-- Date: 2025-12-20
-- Description: Creates tables for manual subscription and payment management

BEGIN;

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pricing
  price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_ars DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'

  -- Limits
  max_users INTEGER NOT NULL DEFAULT 1,
  max_warehouses INTEGER NOT NULL DEFAULT 1,
  max_monthly_orders INTEGER, -- NULL = unlimited

  -- Features (boolean flags)
  feature_purchase_orders BOOLEAN DEFAULT false,
  feature_advanced_reports BOOLEAN DEFAULT false,
  feature_api_access BOOLEAN DEFAULT false,
  feature_priority_support BOOLEAN DEFAULT false,

  -- Storage
  storage_mb INTEGER DEFAULT 100,

  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial plans
INSERT INTO subscription_plans (
  plan_id, name, description,
  price_usd, price_ars,
  max_users, max_warehouses, max_monthly_orders,
  feature_purchase_orders, feature_advanced_reports, feature_api_access,
  storage_mb, display_order
) VALUES
  (
    'free', 'Free', 'Perfect for trying out Betali',
    0, 0,
    1, 1, 10,
    false, false, false,
    100, 1
  ),
  (
    'basic', 'Basic', 'Great for small businesses',
    29, 29000,
    5, 3, NULL,
    true, false, false,
    1024, 2
  ),
  (
    'professional', 'Professional', 'For growing businesses',
    79, 79000,
    15, 10, NULL,
    true, true, false,
    10240, 3
  ),
  (
    'enterprise', 'Enterprise', 'For large organizations',
    199, 199000,
    NULL, NULL, NULL,
    true, true, true,
    NULL, 4
  )
ON CONFLICT (plan_id) DO NOTHING;

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Plan details
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(plan_id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'past_due', 'cancelled', 'expired'

  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD', -- 'USD', 'ARS'
  billing_period VARCHAR(20) DEFAULT 'monthly',

  -- Billing dates
  activated_at TIMESTAMP,
  next_billing_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Trial
  trial_ends_at TIMESTAMP,
  is_trial BOOLEAN DEFAULT false,

  -- Notes for manual management
  notes TEXT,
  admin_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure only one active subscription per organization
  CONSTRAINT unique_active_subscription
    UNIQUE(organization_id)
);

-- Auto-create free subscription for new organizations
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    organization_id,
    plan_id,
    status,
    amount,
    currency,
    activated_at
  ) VALUES (
    NEW.organization_id,
    'free',
    'active',
    0,
    'USD',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create free subscription
DROP TRIGGER IF EXISTS trigger_create_default_subscription ON organizations;
CREATE TRIGGER trigger_create_default_subscription
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ============================================================================
-- MANUAL PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS manual_payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'bank_transfer', 'cash', 'check', 'other'

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'

  -- Dates
  payment_date TIMESTAMP,
  confirmed_at TIMESTAMP,

  -- References
  invoice_number VARCHAR(100),
  transaction_reference VARCHAR(255),

  -- Notes
  notes TEXT,
  admin_notes TEXT,

  -- Proof of payment
  receipt_url TEXT,

  -- Tracking
  recorded_by UUID NOT NULL REFERENCES users(user_id),
  confirmed_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INVOICES TABLE (for tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'

  -- Dates
  issue_date TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,

  -- Period covered
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-generate invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- ============================================================================
-- SUBSCRIPTION HISTORY (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_history (
  history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- What changed
  event_type VARCHAR(50) NOT NULL, -- 'created', 'activated', 'plan_changed', 'cancelled', 'renewed'
  old_plan_id VARCHAR(50),
  new_plan_id VARCHAR(50),
  old_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Details
  notes TEXT,
  changed_by UUID REFERENCES users(user_id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_manual_payments_org ON manual_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription ON manual_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_org ON subscription_history(organization_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if organization has feature access
CREATE OR REPLACE FUNCTION has_feature_access(
  org_id UUID,
  feature_name VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
  current_plan subscription_plans%ROWTYPE;
BEGIN
  -- Get current active subscription plan
  SELECT sp.* INTO current_plan
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.plan_id
  WHERE s.organization_id = org_id
    AND s.status = 'active'
  LIMIT 1;

  -- If no subscription found, default to free plan
  IF NOT FOUND THEN
    SELECT * INTO current_plan FROM subscription_plans WHERE plan_id = 'free';
  END IF;

  -- Check feature
  CASE feature_name
    WHEN 'purchase_orders' THEN has_access := current_plan.feature_purchase_orders;
    WHEN 'advanced_reports' THEN has_access := current_plan.feature_advanced_reports;
    WHEN 'api_access' THEN has_access := current_plan.feature_api_access;
    WHEN 'priority_support' THEN has_access := current_plan.feature_priority_support;
    ELSE has_access := false;
  END CASE;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization's current plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(org_id UUID)
RETURNS TABLE(
  max_users INTEGER,
  max_warehouses INTEGER,
  max_monthly_orders INTEGER,
  storage_mb INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.max_users,
    sp.max_warehouses,
    sp.max_monthly_orders,
    sp.storage_mb
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.plan_id
  WHERE s.organization_id = org_id
    AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE subscription_plans IS 'Available subscription plans with features and pricing';
COMMENT ON TABLE subscriptions IS 'Organization subscriptions with manual billing support';
COMMENT ON TABLE manual_payments IS 'Manual payment records for tracking offline payments';
COMMENT ON TABLE invoices IS 'Generated invoices for billing periods';
COMMENT ON TABLE subscription_history IS 'Audit trail of subscription changes';

COMMENT ON FUNCTION has_feature_access IS 'Check if organization has access to a specific feature';
COMMENT ON FUNCTION get_plan_limits IS 'Get current plan limits for an organization';

COMMIT;

-- ============================================================================
-- ROLLBACK (keep commented)
-- ============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_create_default_subscription ON organizations;
-- DROP FUNCTION IF EXISTS create_default_subscription();
-- DROP FUNCTION IF EXISTS has_feature_access(UUID, VARCHAR);
-- DROP FUNCTION IF EXISTS get_plan_limits(UUID);
-- DROP TABLE IF EXISTS subscription_history CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS manual_payments CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS subscription_plans CASCADE;
-- DROP SEQUENCE IF EXISTS invoice_number_seq;
-- COMMIT;
