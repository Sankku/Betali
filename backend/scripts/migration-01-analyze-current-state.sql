-- Migration 01: Analyze Current Database State
-- This script analyzes the current database structure before starting the SaaS migration
-- Run this to understand what data exists and plan the migration

-- Check current structure of users table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current structure of organizations table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current structure of user_organizations table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_organizations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Count existing data
SELECT 
  'users' as table_name, 
  COUNT(*) as record_count,
  COUNT(DISTINCT role) as unique_roles
FROM users
UNION ALL
SELECT 
  'organizations' as table_name, 
  COUNT(*) as record_count,
  NULL as unique_roles
FROM organizations
UNION ALL
SELECT 
  'user_organizations' as table_name, 
  COUNT(*) as record_count,
  COUNT(DISTINCT role) as unique_roles
FROM user_organizations;

-- Check unique roles in users table
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

-- Check unique roles in user_organizations table
SELECT role, COUNT(*) as count 
FROM user_organizations 
GROUP BY role 
ORDER BY count DESC;

-- Check business tables that need organization_id
SELECT 
  table_name,
  column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'products', 
    'warehouse', 
    'stock_movements', 
    'clients', 
    'orders', 
    'order_details'
  )
  AND column_name = 'organization_id';

-- Check foreign key constraints
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (
    tc.table_name IN ('users', 'organizations', 'user_organizations') OR
    ccu.table_name IN ('users', 'organizations', 'user_organizations')
  )
ORDER BY tc.table_name, tc.constraint_name;