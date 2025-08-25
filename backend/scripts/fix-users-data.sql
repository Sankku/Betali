-- Fix existing users data to comply with check constraint
-- Execute this SQL in Supabase SQL Editor BEFORE adding constraints

-- Step 1: Remove the problematic constraint first
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_organization_required;

-- Step 2: Update existing users data
-- Set role to 'member' for users who don't have a role
UPDATE users 
SET role = 'member' 
WHERE role IS NULL;

-- Step 3: Check current users and their data
SELECT user_id, name, email, role, organization_id 
FROM users 
ORDER BY created_at;

-- Step 4: For users without organization_id but role != 'super_admin', 
-- we need to either:
-- Option A: Set them as super_admin (if they should be)
-- UPDATE users SET role = 'super_admin' WHERE organization_id IS NULL AND role != 'super_admin';

-- Option B: Assign them to a default organization (replace 'your-org-id' with real org ID)
-- UPDATE users 
-- SET organization_id = 'your-org-id' 
-- WHERE organization_id IS NULL AND role != 'super_admin';

-- Step 5: ONLY after fixing data, add the constraint back (optional)
-- ALTER TABLE users 
-- ADD CONSTRAINT check_organization_required 
-- CHECK (
--   (role = 'super_admin' AND organization_id IS NULL) OR 
--   (role != 'super_admin' AND organization_id IS NOT NULL) OR
--   role IS NULL
-- );