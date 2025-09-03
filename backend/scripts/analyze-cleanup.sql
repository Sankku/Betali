-- Analysis script to see what will be deleted (READ-ONLY)
-- Run this first to understand the impact before cleanup

-- Users that will be deleted
SELECT 'USERS TO DELETE:' as section, '' as detail
UNION ALL
SELECT 'Count:', COUNT(*)::text
FROM users 
WHERE organization_id IS NULL 
  AND is_active = true 
  AND created_at < NOW() - INTERVAL '1 hour'
UNION ALL
SELECT '', '';

SELECT 
    u.user_id, 
    u.email, 
    u.name, 
    u.created_at,
    'USER' as type
FROM users u
WHERE u.organization_id IS NULL 
  AND u.is_active = true 
  AND u.created_at < NOW() - INTERVAL '1 hour'
ORDER BY u.created_at;

-- Organizations that will be deleted
SELECT 'ORGANIZATIONS TO DELETE:' as section, '' as detail
UNION ALL
SELECT 'Count:', COUNT(*)::text
FROM organizations o
WHERE o.owner_user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
)
UNION ALL
SELECT '', '';

SELECT 
    o.organization_id,
    o.name,
    o.slug,
    o.created_at,
    'ORGANIZATION' as type
FROM organizations o
WHERE o.owner_user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
)
ORDER BY o.created_at;

-- Products that will be deleted
SELECT 'PRODUCTS TO DELETE:' as section, '' as detail
UNION ALL
SELECT 'Count:', COUNT(*)::text
FROM products p
WHERE p.organization_id IN (
    SELECT o.organization_id FROM organizations o
    WHERE o.owner_user_id IN (
        SELECT user_id FROM users 
        WHERE organization_id IS NULL 
          AND is_active = true 
          AND created_at < NOW() - INTERVAL '1 hour'
    )
)
UNION ALL
SELECT '', '';

SELECT 
    p.product_id,
    p.name,
    p.sku,
    p.organization_id,
    'PRODUCT' as type
FROM products p
WHERE p.organization_id IN (
    SELECT o.organization_id FROM organizations o
    WHERE o.owner_user_id IN (
        SELECT user_id FROM users 
        WHERE organization_id IS NULL 
          AND is_active = true 
          AND created_at < NOW() - INTERVAL '1 hour'
    )
)
ORDER BY p.created_at;

-- Summary
SELECT 'SUMMARY:' as section, '' as detail
UNION ALL
SELECT 'Users to delete:', COUNT(*)::text
FROM users 
WHERE organization_id IS NULL 
  AND is_active = true 
  AND created_at < NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'Organizations to delete:', COUNT(*)::text
FROM organizations o
WHERE o.owner_user_id IN (
    SELECT user_id FROM users 
    WHERE organization_id IS NULL 
      AND is_active = true 
      AND created_at < NOW() - INTERVAL '1 hour'
)
UNION ALL
SELECT 'Products to delete:', COUNT(*)::text
FROM products p
WHERE p.organization_id IN (
    SELECT o.organization_id FROM organizations o
    WHERE o.owner_user_id IN (
        SELECT user_id FROM users 
        WHERE organization_id IS NULL 
          AND is_active = true 
          AND created_at < NOW() - INTERVAL '1 hour'
    )
);

SELECT 'NOTE: This is READ-ONLY analysis. No data will be deleted.' as note;