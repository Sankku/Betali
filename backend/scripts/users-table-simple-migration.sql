-- Simple Migration: Add missing columns to users table
-- Execute this SQL in Supabase SQL Editor

-- Step 1: Add role column to users table (needed for multi-tenant support)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';

-- Step 2: Add organization_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id);

-- Step 3: Add basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 4: Create a junction table for user-organization relationships (for multi-tenant support)
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate user-organization relationships
    UNIQUE(user_id, organization_id)
);

-- Step 5: Create indexes on user_organizations
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);

-- Step 6: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger for user_organizations table
DROP TRIGGER IF EXISTS update_user_organizations_updated_at ON user_organizations;
CREATE TRIGGER update_user_organizations_updated_at
    BEFORE UPDATE ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();