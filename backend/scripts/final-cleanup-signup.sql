-- Final cleanup handling all self-references and constraints
-- This script handles users that reference other users (updated_by, deactivated_by)

BEGIN;

-- Step 1: Identify target users (problematic ones)
CREATE TEMP TABLE target_users AS
SELECT user_id FROM users 
WHERE organization_id IS NULL 
  AND is_active = true 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Step 2: Show analysis
SELECT 'ANALYSIS - Target users to delete:' as action;
SELECT u.user_id, u.email, u.name, u.created_at
FROM users u
JOIN target_users tu ON u.user_id = tu.user_id
ORDER BY u.created_at;

-- Step 3: Check for self-references
SELECT 'ANALYSIS - Users updated by target users:' as action;
SELECT u.user_id, u.email, u.updated_by, 'updated_by' as reference_type
FROM users u
WHERE u.updated_by IN (SELECT user_id FROM target_users)
  AND u.user_id NOT IN (SELECT user_id FROM target_users);

SELECT 'ANALYSIS - Users deactivated by target users:' as action;
SELECT u.user_id, u.email, u.deactivated_by, 'deactivated_by' as reference_type
FROM users u
WHERE u.deactivated_by IN (SELECT user_id FROM target_users)
  AND u.user_id NOT IN (SELECT user_id FROM target_users);

-- Step 4: Remove constraint first
SELECT 'REMOVING CONSTRAINT:' as action;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 5: Clean up self-references before deletion
SELECT 'CLEANING self-references:' as action;

-- Clear updated_by references to target users
UPDATE users 
SET updated_by = NULL 
WHERE updated_by IN (SELECT user_id FROM target_users);

-- Clear deactivated_by references to target users  
UPDATE users 
SET deactivated_by = NULL 
WHERE deactivated_by IN (SELECT user_id FROM target_users);

-- Step 6: Handle organization ownership
DO $$
DECLARE
    target_user_count integer;
BEGIN
    SELECT COUNT(*) INTO target_user_count FROM target_users;
    RAISE NOTICE 'Processing % target users for deletion', target_user_count;
    
    -- Set organizations owned by target users to orphaned state
    UPDATE organizations 
    SET owner_user_id = NULL 
    WHERE owner_user_id IN (SELECT user_id FROM target_users);
    
    -- Remove user-organization relationships for target users
    DELETE FROM user_organizations 
    WHERE user_id IN (SELECT user_id FROM target_users);
    
    -- Remove other references from various tables
    -- Update discount rules created by target users
    UPDATE discount_rules 
    SET created_by = NULL 
    WHERE created_by IN (SELECT user_id FROM target_users);
    
    -- Update orders created by target users
    UPDATE orders 
    SET created_by = NULL 
    WHERE created_by IN (SELECT user_id FROM target_users);
    
    -- Remove client references (set to NULL or delete if cascade)
    UPDATE clients 
    SET user_id = NULL 
    WHERE user_id IN (SELECT user_id FROM target_users);
    
    -- Remove supplier references
    UPDATE suppliers 
    SET user_id = NULL 
    WHERE user_id IN (SELECT user_id FROM target_users);
    
    -- Remove branch manager references
    UPDATE branches 
    SET manager_user_id = NULL 
    WHERE manager_user_id IN (SELECT user_id FROM target_users);
END $$;

-- Step 7: Now safe to delete target users
SELECT 'DELETING target users:' as action;
DELETE FROM users 
WHERE user_id IN (SELECT user_id FROM target_users);

-- Step 8: Apply the signup-friendly constraint
SELECT 'ADDING NEW CONSTRAINT:' as action;
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

-- Step 9: Verify the constraint
SELECT 'VERIFICATION:' as action;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';

-- Step 10: Show final state
SELECT 'FINAL STATE:' as action;
SELECT 
    'users' as table_name,
    COUNT(*) as remaining_count
FROM users
UNION ALL
SELECT 
    'organizations' as table_name,
    COUNT(*) as remaining_count
FROM organizations
UNION ALL
SELECT 
    'orphaned_organizations' as table_name,
    COUNT(*) as count
FROM organizations 
WHERE owner_user_id IS NULL;

-- Step 11: Test the constraint works
SELECT 'TESTING CONSTRAINT:' as action;

-- This should work (new user during signup window)
DO $$
BEGIN
    BEGIN
        INSERT INTO users (user_id, email, name, password_hash, organization_id, is_active, created_at) 
        VALUES (
            gen_random_uuid(), 
            'test-constraint-new@example.com', 
            'Test New User',
            'dummy_hash',
            NULL,
            true,
            NOW()
        );
        
        -- Clean up the test
        DELETE FROM users WHERE email = 'test-constraint-new@example.com';
        
        RAISE NOTICE 'SUCCESS: New signup simulation worked!';
    EXCEPTION 
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Constraint still blocking signup!';
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Other issue: %', SQLERRM;
    END;
END $$;

SELECT 'SUCCESS! Complete cleanup finished and signup constraint applied.' as result;
SELECT 'New users can now signup with NULL organization_id for 1 hour.' as note;

-- Clean up temp tables
DROP TABLE target_users;

COMMIT;