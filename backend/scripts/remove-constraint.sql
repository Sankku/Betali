-- Remove the problematic constraint that's causing the error
-- Execute this SQL in Supabase SQL Editor

-- Remove the constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;