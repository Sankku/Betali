-- Fix manual_payments table to allow system-generated payments (webhook path)
-- recorded_by is NULL when payment is recorded automatically by MercadoPago webhook

ALTER TABLE manual_payments
  ALTER COLUMN recorded_by DROP NOT NULL;

-- Also ensure confirmed_by allows NULL (already nullable per original schema, but being explicit)
-- No change needed for confirmed_by as it was already nullable

COMMENT ON COLUMN manual_payments.recorded_by IS 'User UUID who recorded the payment. NULL for automatic webhook payments from MercadoPago.';
