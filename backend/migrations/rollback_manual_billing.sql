-- Rollback Manual Billing System
-- Date: 2025-12-22
-- Description: Remove manual billing tables to prepare for Stripe integration

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_default_subscription ON organizations;
DROP TRIGGER IF EXISTS trigger_log_subscription_change ON subscriptions;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_manual_payments_updated_at ON manual_payments;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

-- Drop functions
DROP FUNCTION IF EXISTS has_feature_access(UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_active_subscription(UUID);
DROP FUNCTION IF EXISTS log_subscription_change();
DROP FUNCTION IF EXISTS create_default_subscription();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS manual_payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Note: We do NOT drop subscription_plans as it will be used with Stripe

COMMIT;

-- Verify cleanup
SELECT 'Tables removed. subscription_plans retained for Stripe integration.' as status;
