-- Smart cleanup that handles mixed organization ownership
-- This script safely disconnects users and cleans up data

BEGIN;

-- Step 1: Identify target users (problematic ones)
CREATE TEMP TABLE target_users AS
SELECT user_id FROM users 
WHERE organization_id IS NULL 
  AND is_active = true 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Step 2: Identify organizations owned by target users
CREATE TEMP TABLE target_owned_orgs AS
SELECT DISTINCT o.organization_id 
FROM organizations o
WHERE o.owner_user_id IN (SELECT user_id FROM target_users);

-- Step 3: Check if other users reference these organizations
CREATE TEMP TABLE other_users_in_orgs AS
SELECT DISTINCT u.user_id, u.organization_id, u.email
FROM users u
WHERE u.organization_id IN (SELECT organization_id FROM target_owned_orgs)
  AND u.user_id NOT IN (SELECT user_id FROM target_users);

-- Step 4: Show analysis
SELECT 'ANALYSIS - Target users to delete:' as action;
SELECT u.user_id, u.email, u.name, u.created_at
FROM users u
JOIN target_users tu ON u.user_id = tu.user_id
ORDER BY u.created_at;

SELECT 'ANALYSIS - Organizations owned by target users:' as action;
SELECT o.organization_id, o.name, o.slug, o.owner_user_id
FROM organizations o
JOIN target_owned_orgs too ON o.organization_id = too.organization_id;

SELECT 'ANALYSIS - Other users that would be affected:' as action;
SELECT * FROM other_users_in_orgs;

-- Step 5: Remove constraint first
SELECT 'REMOVING CONSTRAINT:' as action;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 6: Decide strategy based on what we found
DO $$
DECLARE
    other_users_count integer;
    orgs_to_delete integer;
BEGIN
    -- Count other users that would be affected
    SELECT COUNT(*) INTO other_users_count FROM other_users_in_orgs;
    SELECT COUNT(*) INTO orgs_to_delete FROM target_owned_orgs;
    
    RAISE NOTICE 'Found % other users that would be affected', other_users_count;
    RAISE NOTICE 'Found % organizations to potentially delete', orgs_to_delete;
    
    IF other_users_count = 0 THEN
        -- Safe to delete organizations completely
        RAISE NOTICE 'STRATEGY: Complete deletion (no other users affected)';
        
        -- Delete all dependent data
        DELETE FROM applied_discounts WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM product_tax_groups WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM discount_rule_products WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM customer_pricing WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM pricing_tiers WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM order_details WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM orders WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM stock_movements WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM products WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM warehouse WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM clients WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM suppliers WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM tax_rates WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM discount_rules WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM branches WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM user_organizations WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM organizations WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        DELETE FROM users WHERE user_id IN (SELECT user_id FROM target_users);
        
    ELSE
        -- Need to preserve organizations but remove target users
        RAISE NOTICE 'STRATEGY: Preserve organizations, transfer ownership or orphan them';
        
        -- Option A: Set organizations as orphaned (owner_user_id = NULL)
        UPDATE organizations 
        SET owner_user_id = NULL 
        WHERE organization_id IN (SELECT organization_id FROM target_owned_orgs);
        
        -- Remove user-organization relationships for target users only
        DELETE FROM user_organizations 
        WHERE user_id IN (SELECT user_id FROM target_users);
        
        -- Finally delete target users
        DELETE FROM users WHERE user_id IN (SELECT user_id FROM target_users);
        
    END IF;
END $$;

-- Step 7: Apply the signup-friendly constraint
SELECT 'ADDING NEW CONSTRAINT:' as action;
ALTER TABLE users ADD CONSTRAINT check_organization_flexible 
CHECK (
  (organization_id IS NOT NULL) OR 
  (organization_id IS NULL AND is_active = false) OR
  (organization_id IS NULL AND created_at >= NOW() - INTERVAL '1 hour')
);

-- Step 8: Verify the constraint
SELECT 'VERIFICATION:' as action;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE 'check_organization%';

-- Step 9: Show final state
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

SELECT 'Organizations with NULL owner (orphaned):' as note;
SELECT organization_id, name, slug, owner_user_id
FROM organizations 
WHERE owner_user_id IS NULL;

SELECT 'SUCCESS! Smart cleanup completed.' as result;
SELECT 'Signup constraint applied - new users can signup normally.' as note;

-- Clean up temp tables
DROP TABLE target_users;
DROP TABLE target_owned_orgs;
DROP TABLE other_users_in_orgs;

COMMIT;