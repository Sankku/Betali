-- Clean database with proper foreign key handling
-- This script handles organizations owned by users we want to delete

BEGIN;

-- Step 1: Analyze what we need to delete
SELECT 'ANALYSIS - Users to delete:' as action;
SELECT 
    u.user_id,
    u.email,
    u.name,
    u.organization_id,
    u.is_active,
    u.created_at
FROM users u
WHERE 
    u.organization_id IS NULL 
    AND u.is_active = true 
    AND u.created_at < NOW() - INTERVAL '1 hour'
ORDER BY u.created_at;

-- Step 2: Check organizations owned by these users
SELECT 'ANALYSIS - Organizations owned by users to delete:' as action;
SELECT 
    o.organization_id,
    o.name,
    o.slug,
    o.owner_user_id,
    u.email as owner_email
FROM organizations o
JOIN users u ON o.owner_user_id = u.user_id
WHERE u.user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
);

-- Step 3: Check user-organization relationships
SELECT 'ANALYSIS - User-organization relationships to delete:' as action;
SELECT 
    uo.user_organization_id,
    uo.user_id,
    uo.organization_id,
    uo.role,
    u.email
FROM user_organizations uo
JOIN users u ON uo.user_id = u.user_id
WHERE u.user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
);

-- Step 4: Remove the problematic constraint first
SELECT 'REMOVING CONSTRAINT:' as action;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 5: Delete in proper order to avoid foreign key violations

-- 5a: Delete user-organization relationships first
SELECT 'DELETING user-organization relationships:' as action;
DELETE FROM user_organizations 
WHERE user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
);

-- 5b: Delete organizations owned by these users
SELECT 'DELETING organizations:' as action;
DELETE FROM organizations 
WHERE owner_user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
);

-- 5c: Finally delete the users
SELECT 'DELETING users:' as action;
DELETE FROM users 
WHERE 
    organization_id IS NULL 
    AND is_active = true 
    AND created_at < NOW() - INTERVAL '1 hour';

-- Step 6: Apply the signup-friendly constraint
SELECT 'ADDING NEW CONSTRAINT:' as action;
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

-- Step 7: Verify the constraint was applied
SELECT 'VERIFICATION:' as action;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';

-- Step 8: Show final state
SELECT 'FINAL STATE - Remaining users:' as action;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as users_with_org,
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as users_without_org
FROM users;

SELECT 'SUCCESS! Database cleaned and signup constraint fixed.' as result;

COMMIT;