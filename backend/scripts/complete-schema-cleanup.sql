-- Complete cleanup based on actual database schema
-- This script handles all foreign key dependencies correctly

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

-- Step 4: Delete in correct dependency order

-- 4a: Applied discounts (references orders)
SELECT 'DELETING applied_discounts:' as action;
DELETE FROM applied_discounts 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4b: Product tax groups
SELECT 'DELETING product_tax_groups:' as action;
DELETE FROM product_tax_groups 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4c: Discount rule products
SELECT 'DELETING discount_rule_products:' as action;
DELETE FROM discount_rule_products 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4d: Customer pricing
SELECT 'DELETING customer_pricing:' as action;
DELETE FROM customer_pricing 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4e: Pricing tiers
SELECT 'DELETING pricing_tiers:' as action;
DELETE FROM pricing_tiers 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4f: Order details (references orders and products)
SELECT 'DELETING order_details:' as action;
DELETE FROM order_details 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4g: Orders
SELECT 'DELETING orders:' as action;
DELETE FROM orders 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4h: Stock movements
SELECT 'DELETING stock_movements:' as action;
DELETE FROM stock_movements 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4i: Products
SELECT 'DELETING products:' as action;
DELETE FROM products 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4j: Warehouse
SELECT 'DELETING warehouse:' as action;
DELETE FROM warehouse 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4k: Clients
SELECT 'DELETING clients:' as action;
DELETE FROM clients 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4l: Suppliers
SELECT 'DELETING suppliers:' as action;
DELETE FROM suppliers 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4m: Tax rates
SELECT 'DELETING tax_rates:' as action;
DELETE FROM tax_rates 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4n: Discount rules
SELECT 'DELETING discount_rules:' as action;
DELETE FROM discount_rules 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4o: Branches
SELECT 'DELETING branches:' as action;
DELETE FROM branches 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4p: User-organization relationships
SELECT 'DELETING user_organizations:' as action;
DELETE FROM user_organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4q: Organizations
SELECT 'DELETING organizations:' as action;
DELETE FROM organizations 
WHERE organization_id IN (SELECT organization_id FROM target_organizations);

-- 4r: Finally, users
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
FROM products
UNION ALL
SELECT 
    'warehouse' as table_name,
    COUNT(*) as remaining_count
FROM warehouse;

SELECT 'SUCCESS! Complete database cleanup finished.' as result;
SELECT 'Signup constraint applied - new users can signup normally.' as note;

-- Clean up temp tables
DROP TABLE target_users;
DROP TABLE target_organizations;

COMMIT;