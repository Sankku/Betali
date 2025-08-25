-- Add only the missing columns to users table
-- Execute this SQL in Supabase SQL Editor

-- Step 1: Add role column to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(50) DEFAULT 'member';

-- Step 2: Add organization_id column to users table  
ALTER TABLE users 
ADD COLUMN organization_id UUID REFERENCES organizations(organization_id);

-- Step 3: Add basic indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);