-- Final fix for users table to align with SaaS multi-tenant architecture
-- This script removes the problematic constraint and cleans up the schema

BEGIN;

-- 1. Remove the problematic constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- 2. Remove the confusing global role column (should use user_organizations.role instead)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- 3. Remove organization_id from users table (should use user_organizations table)
-- First remove the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
-- Then drop the column
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;

-- 4. Remove branch_id from users table (should use user_organizations.branch_id)
-- First remove the foreign key constraint  
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_id_fkey;
-- Then drop the column
ALTER TABLE users DROP COLUMN IF EXISTS branch_id;

-- 5. Remove permissions from users table (should use user_organizations.permissions)
ALTER TABLE users DROP COLUMN IF EXISTS permissions;

-- 6. Drop obsolete indexes
DROP INDEX IF EXISTS idx_users_organization_id;
DROP INDEX IF EXISTS idx_users_branch_id;
DROP INDEX IF EXISTS idx_users_org_role;
DROP INDEX IF EXISTS idx_users_role;

-- 7. Clean users table schema - only global user data
-- The table should now have only:
-- user_id, name, email, password_hash, is_active, created_at, updated_at

-- 8. Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;

-- Show final table structure
\d users;