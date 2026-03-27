-- scripts/backup-real-data.sql
-- Run this in the Supabase SQL editor BEFORE applying the migration.
-- Copy the output and save it somewhere safe.

-- Export organizations
SELECT 'INSERT INTO organizations VALUES (' ||
  quote_literal(organization_id) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(slug) || ',' ||
  COALESCE(quote_literal(plan_type), 'NULL') || ',' ||
  COALESCE(max_users::text, 'NULL') || ',' ||
  COALESCE(max_warehouses::text, 'NULL') ||
  ');'
FROM organizations;

-- Export users (skip password_hash — users will re-auth via Supabase Auth)
SELECT 'INSERT INTO users(user_id,email,name,role,organization_id,is_active,created_at) VALUES (' ||
  quote_literal(user_id) || ',' ||
  quote_literal(email) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(role) || ',' ||
  COALESCE(quote_literal(organization_id), 'NULL') || ',' ||
  COALESCE(is_active::text, 'true') || ',' ||
  COALESCE(quote_literal(created_at), 'NOW()') ||
  ');'
FROM users;

-- Export user_organizations memberships
SELECT 'INSERT INTO user_organizations VALUES (' ||
  quote_literal(user_organization_id) || ',' ||
  quote_literal(user_id) || ',' ||
  quote_literal(organization_id) || ',' ||
  COALESCE(quote_literal(branch_id), 'NULL') || ',' ||
  quote_literal(role) || ',' ||
  quote_literal(permissions::text) || '::jsonb,' ||
  is_active::text || ',' ||
  quote_literal(joined_at) ||
  ');'
FROM user_organizations;

-- Export warehouses
SELECT 'INSERT INTO warehouse(warehouse_id,name,location,organization_id,is_active,created_at) VALUES (' ||
  quote_literal(warehouse_id) || ',' ||
  quote_literal(name) || ',' ||
  COALESCE(quote_literal(location), 'NULL') || ',' ||
  COALESCE(quote_literal(organization_id), 'NULL') || ',' ||
  COALESCE(is_active::text, 'true') || ',' ||
  COALESCE(quote_literal(created_at), 'NOW()') ||
  ');'
FROM warehouse;
