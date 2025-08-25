-- Migration 03: Fix user role system
-- This script updates the role system to follow the new SaaS architecture
-- where roles are only organization-specific, not global

-- Step 1: Backup current user roles (in case we need to rollback)
CREATE TABLE IF NOT EXISTS migration_backup_user_roles AS
SELECT user_id, role, created_at, updated_at 
FROM users;

-- Step 2: Update user_organizations roles to follow new hierarchy
-- Convert super_admin to owner for organization owners
UPDATE user_organizations 
SET role = 'owner' 
WHERE role = 'super_admin' 
  AND user_id IN (
    SELECT owner_user_id 
    FROM organizations 
    WHERE owner_user_id IS NOT NULL
  );

-- Step 3: Convert remaining super_admin to admin
-- (users who are super_admin but not organization owners)
UPDATE user_organizations 
SET role = 'admin' 
WHERE role = 'super_admin';

-- Step 4: Remove the confusing global role column from users
-- (Comment out for now, will enable after frontend is updated)
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 5: Update role constraints if they exist
-- First check what roles exist in user_organizations
SELECT DISTINCT role 
FROM user_organizations 
ORDER BY role;

-- Verification query: Check new role distribution
SELECT 
  uo.role,
  COUNT(*) as count,
  COUNT(DISTINCT uo.organization_id) as organizations_affected
FROM user_organizations uo
GROUP BY uo.role
ORDER BY count DESC;

-- Verification query: Check organization owners
SELECT 
  o.name as organization_name,
  u.email as owner_email,
  uo.role as owner_role_in_org
FROM organizations o
JOIN users u ON o.owner_user_id = u.user_id
JOIN user_organizations uo ON uo.user_id = u.user_id AND uo.organization_id = o.organization_id;