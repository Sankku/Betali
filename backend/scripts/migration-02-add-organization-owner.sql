-- Migration 02: Add organization ownership
-- This script adds the owner_user_id column to organizations table
-- and sets existing users as owners of their organizations

-- Step 1: Add owner_user_id column to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(user_id);

-- Step 2: Set existing organization owners
-- Based on current user_organizations with super_admin role
UPDATE organizations 
SET owner_user_id = (
  SELECT uo.user_id 
  FROM user_organizations uo 
  WHERE uo.organization_id = organizations.organization_id 
    AND uo.role = 'super_admin' 
  LIMIT 1
)
WHERE owner_user_id IS NULL;

-- Step 3: Add constraint to ensure every organization has an owner
-- (Will be enabled after data migration is complete)
-- ALTER TABLE organizations ALTER COLUMN owner_user_id SET NOT NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_user_id 
ON organizations(owner_user_id);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN organizations.owner_user_id IS 'User who owns and can manage this organization';

-- Verification query: Check that all organizations now have owners
SELECT 
  o.organization_id,
  o.name,
  o.owner_user_id,
  u.email as owner_email,
  u.name as owner_name
FROM organizations o
LEFT JOIN users u ON o.owner_user_id = u.user_id;