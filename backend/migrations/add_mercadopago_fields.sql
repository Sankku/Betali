-- ============================================================================
-- Mercado Pago Integration - Database Migration
-- ============================================================================
-- This migration adds necessary fields and tables for Mercado Pago integration
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add Mercado Pago fields to subscriptions table
-- ============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN subscriptions.payment_provider IS 'Payment gateway provider: mercadopago, stripe, manual';
COMMENT ON COLUMN subscriptions.provider_subscription_id IS 'Subscription ID in payment provider system (MP preference ID)';
COMMENT ON COLUMN subscriptions.provider_customer_id IS 'Customer ID in payment provider system';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider
  ON subscriptions(payment_provider);

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id
  ON subscriptions(provider_subscription_id);

-- ============================================================================
-- Create webhook_logs table for debugging payment webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  webhook_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider info
  provider VARCHAR(50) NOT NULL, -- 'mercadopago', 'stripe', etc.
  event_type VARCHAR(100) NOT NULL, -- 'payment', 'subscription', etc.

  -- Webhook data
  event_data JSONB NOT NULL, -- Full webhook payload
  headers JSONB, -- Request headers for verification

  -- Processing info
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,

  -- Indexing
  CONSTRAINT webhook_logs_provider_check CHECK (provider IN ('mercadopago', 'stripe', 'manual', 'other'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider
  ON webhook_logs(provider);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type
  ON webhook_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
  ON webhook_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed
  ON webhook_logs(processed);

-- Add comments
COMMENT ON TABLE webhook_logs IS 'Logs all incoming webhooks from payment providers for debugging and audit trail';
COMMENT ON COLUMN webhook_logs.event_data IS 'Full JSON payload from the webhook';
COMMENT ON COLUMN webhook_logs.headers IS 'HTTP headers for signature verification';

-- ============================================================================
-- Update manual_payments table to support Mercado Pago references
-- ============================================================================
-- NOTE: Commented out because manual_payments table doesn't exist yet
-- This is only needed if you want to track manual payments separately

-- -- Add MP payment ID reference if not exists
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'manual_payments'
--     AND column_name = 'mp_payment_id'
--   ) THEN
--     ALTER TABLE manual_payments
--       ADD COLUMN mp_payment_id VARCHAR(255) DEFAULT NULL;
--
--     COMMENT ON COLUMN manual_payments.mp_payment_id IS 'Mercado Pago payment ID for automatic payments';
--   END IF;
-- END $$;
--
-- -- Create index for MP payment lookups
-- CREATE INDEX IF NOT EXISTS idx_manual_payments_mp_payment_id
--   ON manual_payments(mp_payment_id)
--   WHERE mp_payment_id IS NOT NULL;

-- ============================================================================
-- Create function to get payment gateway for organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_gateway_for_org(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  country_code TEXT;
  gateway TEXT;
BEGIN
  -- Get organization's country (you can extend this based on your data)
  -- For now, default to mercadopago for all
  gateway := 'mercadopago';

  -- Future: Add logic to determine gateway based on country
  -- SELECT country INTO country_code FROM organizations WHERE organization_id = org_id;
  -- IF country_code IN ('AR', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY') THEN
  --   gateway := 'mercadopago';
  -- ELSE
  --   gateway := 'stripe';
  -- END IF;

  RETURN gateway;
END;
$$;

COMMENT ON FUNCTION get_payment_gateway_for_org IS 'Determines which payment gateway to use for an organization based on country';

-- ============================================================================
-- Create view for payment analytics
-- ============================================================================
-- NOTE: Commented out because it requires manual_payments table
-- This view is optional and can be created later if needed

-- CREATE OR REPLACE VIEW payment_analytics AS
-- SELECT
--   s.organization_id,
--   s.plan_id,
--   sp.name as plan_name,
--   s.status as subscription_status,
--   s.payment_provider,
--   s.currency,
--   s.amount,
--   s.billing_cycle,
--   s.start_date,
--   s.next_billing_date,
--   COUNT(mp.payment_id) as total_payments,
--   SUM(CASE WHEN mp.status = 'confirmed' THEN mp.amount ELSE 0 END) as total_paid,
--   MAX(mp.payment_date) as last_payment_date
-- FROM subscriptions s
-- LEFT JOIN subscription_plans sp ON s.plan_id = sp.plan_id
-- LEFT JOIN manual_payments mp ON s.subscription_id = mp.subscription_id
-- GROUP BY
--   s.organization_id,
--   s.plan_id,
--   sp.name,
--   s.status,
--   s.payment_provider,
--   s.currency,
--   s.amount,
--   s.billing_cycle,
--   s.start_date,
--   s.next_billing_date;

-- COMMENT ON VIEW payment_analytics IS 'Analytics view for payment and subscription data';

-- ============================================================================
-- Create function to validate webhook signature (for future use)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_webhook_signature(
  payload TEXT,
  signature TEXT,
  secret TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder for webhook signature validation
  -- MP uses x-signature header for validation
  -- Actual implementation would use HMAC SHA256
  -- For now, we'll validate in the application layer
  RETURN true;
END;
$$;

-- ============================================================================
-- Migration verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Mercado Pago migration completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  - payment_provider, provider_subscription_id, provider_customer_id to subscriptions';
  RAISE NOTICE '  - webhook_logs table';
  RAISE NOTICE '  - Helper functions for payment gateway selection';
  RAISE NOTICE '';
  RAISE NOTICE 'Skipped (optional):';
  RAISE NOTICE '  - manual_payments table updates (not needed for automatic payments)';
  RAISE NOTICE '  - payment_analytics view (can be added later if needed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Configure MERCADOPAGO_ACCESS_TOKEN in backend .env';
  RAISE NOTICE '  2. Configure VITE_MERCADOPAGO_PUBLIC_KEY in frontend .env';
  RAISE NOTICE '  3. Configure webhook URL in Mercado Pago dashboard (use ngrok for local testing)';
  RAISE NOTICE '  4. Test payment flow with sandbox credentials';
END $$;
