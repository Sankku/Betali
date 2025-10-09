-- Update order status constraint to include more useful status values
-- This migration expands the allowed order status values from the current limited set
-- to a more comprehensive set that supports a proper order workflow

-- First, drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint with expanded status values
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'draft',       -- Order being created/edited, not yet submitted
  'pending',     -- Order submitted, waiting for processing
  'processing',  -- Order being prepared/validated
  'shipped',     -- Order has been shipped/dispatched
  'completed',   -- Order fulfilled and completed
  'cancelled'    -- Order cancelled
));

-- Add a comment to document the status flow
COMMENT ON CONSTRAINT orders_status_check ON orders IS 
'Order status constraint: draft -> pending -> processing -> shipped -> completed (or cancelled at any stage)';