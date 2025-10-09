-- Fix Order Status Constraint Migration
-- This script updates the order status constraint to match the values used in the application

-- First, let's see the current constraint (for reference)
-- SELECT conname, pg_get_constraintdef(c.oid) 
-- FROM pg_constraint c 
-- WHERE conrelid = 'orders'::regclass AND contype = 'c';

-- Drop the existing constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the correct constraint with the status values used in the application
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'));

-- Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
WHERE conrelid = 'orders'::regclass AND contype = 'c' AND conname = 'orders_status_check';