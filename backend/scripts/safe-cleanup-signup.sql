-- Safe cleanup that only deletes from existing tables
-- This script checks table existence before deletion

BEGIN;

-- Step 1: Identify target users and organizations
CREATE TEMP TABLE target_users AS
SELECT user_id FROM users 
WHERE organization_id IS NULL 
  AND is_active = true 
  AND created_at < NOW() - INTERVAL '1 hour';

CREATE TEMP TABLE target_organizations AS
SELECT DISTINCT o.organization_id 
FROM organizations o
WHERE o.owner_user_id IN (SELECT user_id FROM target_users);

-- Step 2: Show what will be deleted
SELECT 'ANALYSIS - Users to delete:' as action;
SELECT u.user_id, u.email, u.name, u.created_at
FROM users u
JOIN target_users tu ON u.user_id = tu.user_id
ORDER BY u.created_at;

SELECT 'ANALYSIS - Organizations to delete:' as action;
SELECT o.organization_id, o.name, o.slug
FROM organizations o
JOIN target_organizations to_org ON o.organization_id = to_org.organization_id;

-- Step 3: Remove constraint first
SELECT 'REMOVING CONSTRAINT:' as action;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 4: Delete only from existing tables with organization_id

-- Check and delete from stock_movements (if exists and has organization_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'DELETING stock_movements';
            DELETE FROM stock_movements WHERE organization_id IN (SELECT organization_id FROM target_organizations);
        END IF;
    END IF;
END $$;

-- Check and delete from products
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'DELETING products';
            DELETE FROM products WHERE organization_id IN (SELECT organization_id FROM target_organizations);
        END IF;
    END IF;
END $$;

-- Check and delete from warehouse (note: might be 'warehouse' not 'warehouses')
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'DELETING warehouse';
            DELETE FROM warehouse WHERE organization_id IN (SELECT organization_id FROM target_organizations);
        END IF;
    END IF;
END $$;

-- Check and delete from clients
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'organization_id') THEN
            RAISE NOTICE 'DELETING clients';
            DELETE FROM clients WHERE organization_id IN (SELECT organization_id FROM target_organizations);
        END IF;
    END IF;
END $$;

-- Always delete user_organizations (this should exist)
SELECT 'DELETING user_organizations:' as action;
DELETE FROM user_organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- Always delete organizations
SELECT 'DELETING organizations:' as action;
DELETE FROM organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- Always delete users
SELECT 'DELETING users:' as action;
DELETE FROM users 
WHERE user_id IN (SELECT user_id FROM target_users);

-- Step 5: Apply the signup-friendly constraint
SELECT 'ADDING NEW CONSTRAINT:' as action;
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

-- Step 6: Verify the constraint
SELECT 'VERIFICATION:' as action;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';

-- Step 7: Show final state
SELECT 'FINAL STATE:' as action;
SELECT 
    'users' as table_name,
    COUNT(*) as remaining_count
FROM users
UNION ALL
SELECT 
    'organizations' as table_name,
    COUNT(*) as remaining_count
FROM organizations;

SELECT 'SUCCESS! Database cleaned and signup constraint applied.' as result;

-- Clean up temp tables
DROP TABLE target_users;
DROP TABLE target_organizations;

COMMIT;