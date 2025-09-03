-- Complete cleanup with all foreign key dependencies handled
-- This script removes all test data and applies the signup constraint

BEGIN;

-- Step 1: Identify target users and their organizations
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

-- Step 4: Delete in correct order (most dependent to least dependent)

-- 4a: Delete stock movements (if they reference products/warehouses)
SELECT 'DELETING stock_movements:' as action;
DELETE FROM stock_movements 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4b: Delete products (referenced by stock movements and orders)
SELECT 'DELETING products:' as action;
DELETE FROM products 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4c: Delete warehouses
SELECT 'DELETING warehouses:' as action;  
DELETE FROM warehouses 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4d: Delete clients
SELECT 'DELETING clients:' as action;
DELETE FROM clients 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4e: Delete suppliers (if exists)
DELETE FROM suppliers 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4f: Delete orders and order details (if exists)
DELETE FROM order_details 
WHERE order_id IN (
    SELECT order_id FROM orders 
    WHERE organization_id IN (SELECT organization_id FROM target_organizations)
);

DELETE FROM orders 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4g: Delete pricing related tables (if exists)
DELETE FROM applied_discounts 
WHERE order_id IN (
    SELECT order_id FROM orders 
    WHERE organization_id IN (SELECT organization_id FROM target_organizations)
);

DELETE FROM customer_pricing 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

DELETE FROM pricing_tiers 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

DELETE FROM tax_rates 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

DELETE FROM product_tax_groups 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

DELETE FROM discount_rules 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4h: Delete user-organization relationships
SELECT 'DELETING user_organizations:' as action;
DELETE FROM user_organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4i: Delete organizations
SELECT 'DELETING organizations:' as action;
DELETE FROM organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4j: Finally delete users
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
FROM organizations
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as remaining_count
FROM products;

SELECT 'SUCCESS! Database cleaned and signup constraint applied.' as result;
SELECT 'New users can now signup with NULL organization_id for 1 hour.' as note;

-- Clean up temp tables
DROP TABLE target_users;
DROP TABLE target_organizations;

COMMIT;