-- Migration: Create Manual Billing System (Compatible with existing subscription_plans)
-- Date: 2025-12-22
-- Description: Creates tables for manual subscription and payment management
-- Note: Works with existing subscription_plans table schema

BEGIN;

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'cancelled', 'expired'

  -- Billing
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD', -- 'USD', 'ARS'

  -- Dates
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  next_billing_date TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Tracking
  requested_by UUID REFERENCES users(user_id),
  activated_by UUID REFERENCES users(user_id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique partial index to ensure only one active subscription per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_org_active
  ON subscriptions(organization_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- ============================================================================
-- MANUAL PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS manual_payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'bank_transfer', 'cash', 'check', etc.

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'

  -- Dates
  payment_date TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,

  -- Reference
  reference_number VARCHAR(100),
  notes TEXT,

  -- Tracking
  recorded_by UUID NOT NULL REFERENCES users(user_id),
  confirmed_by UUID REFERENCES users(user_id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription ON manual_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_organization ON manual_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Invoice Details
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'cancelled'

  -- Dates
  issue_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,

  -- PDF/Document
  pdf_url TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- ============================================================================
-- SUBSCRIPTION HISTORY TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_history (
  history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Change Details
  action VARCHAR(50) NOT NULL, -- 'created', 'activated', 'upgraded', 'downgraded', 'cancelled', 'renewed'
  old_plan_id UUID REFERENCES subscription_plans(plan_id),
  new_plan_id UUID REFERENCES subscription_plans(plan_id),
  old_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Context
  reason TEXT,
  performed_by UUID REFERENCES users(user_id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_organization ON subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_action ON subscription_history(action);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if an organization has access to a specific feature
CREATE OR REPLACE FUNCTION has_feature_access(
  org_id UUID,
  feature_name VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  plan_features JSONB;
  has_access BOOLEAN;
BEGIN
  -- Get active subscription's plan features
  SELECT sp.features INTO plan_features
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.plan_id
  WHERE s.organization_id = org_id
    AND s.status = 'active'
  LIMIT 1;

  -- If no active subscription, return false
  IF plan_features IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if feature exists and is true in the JSONB
  has_access := COALESCE((plan_features ->> feature_name)::boolean, FALSE);

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Function to get active subscription for an organization
CREATE OR REPLACE FUNCTION get_active_subscription(org_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name VARCHAR(50),
  status VARCHAR(20),
  start_date TIMESTAMP,
  end_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.subscription_id,
    sp.name,
    s.status,
    s.start_date,
    s.end_date
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.plan_id
  WHERE s.organization_id = org_id
    AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_payments_updated_at
  BEFORE UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Log subscription changes to history
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO subscription_history (
      subscription_id,
      organization_id,
      action,
      new_plan_id,
      new_status,
      performed_by
    ) VALUES (
      NEW.subscription_id,
      NEW.organization_id,
      'created',
      NEW.plan_id,
      NEW.status,
      NEW.requested_by
    );
    RETURN NEW;
  END IF;

  -- On UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status != NEW.status THEN
      INSERT INTO subscription_history (
        subscription_id,
        organization_id,
        action,
        old_plan_id,
        new_plan_id,
        old_status,
        new_status,
        performed_by
      ) VALUES (
        NEW.subscription_id,
        NEW.organization_id,
        CASE
          WHEN NEW.status = 'active' THEN 'activated'
          WHEN NEW.status = 'cancelled' THEN 'cancelled'
          ELSE 'status_changed'
        END,
        OLD.plan_id,
        NEW.plan_id,
        OLD.status,
        NEW.status,
        NEW.activated_by
      );
    END IF;

    -- Plan change
    IF OLD.plan_id != NEW.plan_id THEN
      INSERT INTO subscription_history (
        subscription_id,
        organization_id,
        action,
        old_plan_id,
        new_plan_id,
        old_status,
        new_status,
        performed_by
      ) VALUES (
        NEW.subscription_id,
        NEW.organization_id,
        'plan_changed',
        OLD.plan_id,
        NEW.plan_id,
        OLD.status,
        NEW.status,
        NEW.activated_by
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();

-- Auto-create free subscription for new organizations
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT plan_id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  -- Create active free subscription if free plan exists
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (
      organization_id,
      plan_id,
      status,
      billing_cycle,
      amount,
      currency,
      start_date
    ) VALUES (
      NEW.organization_id,
      free_plan_id,
      'active',
      'monthly',
      0,
      'USD',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_subscription
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE subscriptions IS 'Tracks organization subscriptions to plans';
COMMENT ON TABLE manual_payments IS 'Records manual payments made by organizations';
COMMENT ON TABLE invoices IS 'Invoice records for subscription billing';
COMMENT ON TABLE subscription_history IS 'Audit trail of all subscription changes';

COMMENT ON COLUMN subscriptions.status IS 'pending: awaiting payment, active: currently active, cancelled: user cancelled, expired: not renewed';
COMMENT ON COLUMN manual_payments.status IS 'pending: recorded but not confirmed, confirmed: payment verified, failed: payment failed';
COMMENT ON COLUMN invoices.status IS 'draft: not sent, sent: sent to customer, paid: payment received, cancelled: voided';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Check tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history');

-- Check triggers were created:
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations');

-- Check functions were created:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('has_feature_access', 'get_active_subscription');
