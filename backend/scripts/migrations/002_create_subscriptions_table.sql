-- Migration: Create subscriptions table
-- Date: 2025-11-05
-- Description: Subscription instances for each organization

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Valid statuses: 'trialing', 'active', 'past_due', 'canceled', 'paused'

  -- Billing
  billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Dates
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Payment Gateway
  payment_gateway VARCHAR(20), -- 'mercadopago', 'stripe', null for free plans
  gateway_subscription_id VARCHAR(255), -- External subscription ID
  gateway_customer_id VARCHAR(255),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id),
  CONSTRAINT valid_status CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused', 'pending_payment')),
  CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway ON subscriptions(payment_gateway, gateway_subscription_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Comments
COMMENT ON TABLE subscriptions IS 'Active subscriptions for organizations';
COMMENT ON COLUMN subscriptions.status IS 'trialing, active, past_due, canceled, paused';
COMMENT ON COLUMN subscriptions.gateway_subscription_id IS 'External ID from MercadoPago or Stripe';
COMMENT ON COLUMN subscriptions.metadata IS 'Additional subscription metadata';
