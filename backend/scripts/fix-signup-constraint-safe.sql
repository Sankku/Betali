-- Safe fix for the check_organization_required constraint
-- This script handles existing data before applying the new constraint

BEGIN;

-- Step 1: Analyze problematic users
SELECT 
    user_id,
    email,
    name,
    organization_id,
    is_active,
    created_at,
    CASE 
        WHEN organization_id IS NOT NULL THEN 'OK'
        WHEN organization_id IS NULL AND is_active = false THEN 'OK (inactive)'
        WHEN organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour' THEN 'OK (recent)'
        ELSE 'PROBLEM'
    END as constraint_status
FROM users 
WHERE 
    -- These would violate the new constraint
    organization_id IS NULL 
    AND is_active = true 
    AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Step 2: Check current constraint
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'check_organization_required';

-- Step 3: Drop the problematic constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 4: Fix problematic users (Option A - Set inactive)
-- Uncomment ONE of these options:

-- OPTION A: Set problematic users as inactive (SAFE)
-- UPDATE users 
-- SET is_active = false 
-- WHERE organization_id IS NULL 
--   AND is_active = true 
--   AND created_at < NOW() - INTERVAL '1 hour';

-- OPTION B: Create default organization for orphan users (FUNCTIONAL)
-- WITH default_org AS (
--   INSERT INTO organizations (name, slug, owner_user_id)
--   VALUES ('Legacy Users Organization', 'legacy-users-' || EXTRACT(EPOCH FROM NOW()), NULL)
--   RETURNING organization_id
-- )
-- UPDATE users 
-- SET organization_id = (SELECT organization_id FROM default_org)
-- WHERE organization_id IS NULL 
--   AND is_active = true 
--   AND created_at < NOW() - INTERVAL '1 hour';

-- Step 5: Apply the flexible constraint (after fixing data)
-- ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
-- CHECK (
--   (organization_id IS NOT NULL) OR 
--   (organization_id IS NULL AND is_active = false) OR
--   (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
-- );

-- Step 6: Verify the fix
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'users'::regclass 
-- AND conname LIKE 'check_organization%';

-- Don't commit yet - review the results first
ROLLBACK;