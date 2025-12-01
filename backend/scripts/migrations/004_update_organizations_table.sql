-- Migration: Update organizations table with subscription fields
-- Date: 2025-11-05
-- Description: Add subscription-related fields to organizations table

-- Add subscription fields if they don't exist
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Add foreign key constraint to subscription_plans
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS fk_organizations_subscription_plan;

ALTER TABLE organizations
  ADD CONSTRAINT fk_organizations_subscription_plan
  FOREIGN KEY (subscription_plan)
  REFERENCES subscription_plans(name)
  ON UPDATE CASCADE;

-- Add constraint for valid subscription status
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS chk_organizations_subscription_status;

ALTER TABLE organizations
  ADD CONSTRAINT chk_organizations_subscription_status
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused'));

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan ON organizations(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON organizations(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Update existing organizations to have 'free' plan if null
UPDATE organizations
SET subscription_plan = 'free',
    subscription_status = 'active'
WHERE subscription_plan IS NULL
   OR subscription_status IS NULL;

-- Comments
COMMENT ON COLUMN organizations.subscription_plan IS 'Current subscription plan name (references subscription_plans.name)';
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription status: trialing, active, past_due, canceled, paused';
COMMENT ON COLUMN organizations.trial_ends_at IS 'When the trial period ends (null if not on trial)';
COMMENT ON COLUMN organizations.grace_period_ends_at IS 'Grace period end date after payment failure';
