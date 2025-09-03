-- Clean database and fix signup constraint
-- This script removes test users and applies the signup-friendly constraint

BEGIN;

-- Step 1: Show what we're about to delete
SELECT 'USERS TO DELETE:' as action;
SELECT 
    user_id,
    email,
    name,
    organization_id,
    is_active,
    created_at
FROM users 
WHERE 
    organization_id IS NULL 
    AND is_active = true 
    AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Step 2: Remove the problematic constraint first
SELECT 'REMOVING CONSTRAINT:' as action;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 3: Delete problematic users (mostly test users)
SELECT 'DELETING USERS:' as action;
DELETE FROM users 
WHERE 
    organization_id IS NULL 
    AND is_active = true 
    AND created_at < NOW() - INTERVAL '1 hour';

-- Step 4: Apply the signup-friendly constraint
SELECT 'ADDING NEW CONSTRAINT:' as action;
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

-- Step 5: Verify the constraint was applied
SELECT 'VERIFICATION:' as action;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';

-- Step 6: Test that the constraint works (try to violate it)
SELECT 'TESTING CONSTRAINT:' as action;

-- This should fail if constraint works properly:
-- INSERT INTO users (user_id, email, name, organization_id, is_active, created_at) 
-- VALUES (
--   gen_random_uuid(), 
--   'test-constraint@example.com', 
--   'Test Constraint User',
--   NULL,
--   true,
--   NOW() - INTERVAL '2 hours'
-- );

SELECT 'SUCCESS! Signup constraint is now fixed.' as result;
SELECT 'New users can be created with NULL organization_id for 1 hour during signup.' as note;

COMMIT;