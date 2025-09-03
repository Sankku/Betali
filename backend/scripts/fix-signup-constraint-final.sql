-- Fix SaaS signup constraint issue - Final Solution
-- This allows temporary user creation without organization_id during signup process

BEGIN;

-- First, check what constraints currently exist
SELECT 
    conname, 
    contype, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE '%organization%'
ORDER BY conname;

-- Drop any existing organization-related constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_flexible;

-- Create a new flexible constraint that allows:
-- 1. Users with organization_id (normal case)
-- 2. Users without organization_id if they were created in the last 10 minutes (signup window)
-- 3. Inactive users can have NULL organization_id (for cleanup)
ALTER TABLE users ADD CONSTRAINT check_organization_signup_flexible 
CHECK (
    -- Normal case: user has organization
    (organization_id IS NOT NULL) OR 
    -- Signup window: allow NULL for recently created users
    (organization_id IS NULL AND created_at >= (NOW() - INTERVAL '10 minutes')) OR
    -- Inactive users can have NULL organization_id
    (organization_id IS NULL AND is_active = false)
);

-- Add an index to improve performance for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_signup_window 
ON users(created_at) 
WHERE organization_id IS NULL AND is_active = true;

-- Create a cleanup function to handle orphaned users (users created but never assigned to org)
CREATE OR REPLACE FUNCTION cleanup_orphaned_signup_users() 
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Deactivate users that were created more than 1 hour ago without organization_id
    UPDATE users 
    SET is_active = false, 
        updated_at = NOW()
    WHERE organization_id IS NULL 
    AND is_active = true 
    AND created_at < (NOW() - INTERVAL '1 hour');
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Log the cleanup
    IF cleanup_count > 0 THEN
        INSERT INTO system_logs (log_level, message, created_at)
        VALUES ('INFO', 'Cleaned up ' || cleanup_count || ' orphaned signup users', NOW());
    END IF;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verify the new constraint
SELECT 
    conname, 
    contype, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'check_organization_signup_flexible';

-- Show any users that might be affected by this change
SELECT 
    user_id, 
    email, 
    organization_id, 
    is_active,
    created_at,
    CASE 
        WHEN organization_id IS NOT NULL THEN '✅ Has organization'
        WHEN organization_id IS NULL AND created_at >= (NOW() - INTERVAL '10 minutes') THEN '⏰ In signup window'
        WHEN organization_id IS NULL AND is_active = false THEN '💤 Inactive user'
        ELSE '❌ Would violate constraint'
    END as status
FROM users 
WHERE organization_id IS NULL OR created_at >= (NOW() - INTERVAL '1 hour')
ORDER BY created_at DESC
LIMIT 10;