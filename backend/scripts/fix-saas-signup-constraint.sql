-- Fix the check_organization_required constraint for SaaS signup flow
-- This script temporarily removes the constraint that prevents creating users without organization_id

BEGIN;

-- Check current constraint
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'check_organization_required';

-- Drop the constraint temporarily
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Create a more flexible constraint that allows NULL organization_id for initial signup
-- but requires organization_id for active users
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

COMMIT;

-- Verify the change
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';