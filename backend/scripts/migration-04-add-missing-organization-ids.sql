-- Migration 04: Add organization_id to missing business tables
-- This script adds organization_id columns to tables that are missing them
-- and migrates existing data to the default organization

-- Step 1: Add organization_id to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(organization_id);

-- Step 2: Add organization_id to orders table  
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(organization_id);

-- Step 3: Add organization_id to order_details table (if it exists and missing)
-- First check if order_details exists and needs organization_id
DO $$ 
BEGIN
  -- Check if order_details table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_details') THEN
    -- Check if it already has organization_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_details' AND column_name = 'organization_id') THEN
      ALTER TABLE order_details ADD COLUMN organization_id uuid REFERENCES organizations(organization_id);
    END IF;
  END IF;
END $$;

-- Step 4: Migrate existing data to the first/default organization
-- Get the first organization ID for data migration
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get the first organization ID
  SELECT organization_id INTO default_org_id 
  FROM organizations 
  ORDER BY created_at 
  LIMIT 1;
  
  -- Update clients table
  IF default_org_id IS NOT NULL THEN
    UPDATE clients 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update orders table
    UPDATE orders 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update order_details if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_details') THEN
      UPDATE order_details 
      SET organization_id = default_org_id 
      WHERE organization_id IS NULL;
    END IF;
    
    RAISE NOTICE 'Migrated existing data to organization: %', default_org_id;
  ELSE
    RAISE NOTICE 'No organizations found for data migration';
  END IF;
END $$;

-- Step 5: Add NOT NULL constraints (after data migration)
-- (Comment out for now, will enable after confirming data migration)
-- ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);

-- Check if order_details exists before creating index
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_details') THEN
    CREATE INDEX IF NOT EXISTS idx_order_details_organization_id ON order_details(organization_id);
  END IF;
END $$;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN clients.organization_id IS 'Organization that owns this client record';
COMMENT ON COLUMN orders.organization_id IS 'Organization that owns this order record';

-- Verification queries
-- Check clients migration
SELECT 
  'clients' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id,
  COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM clients
UNION ALL
-- Check orders migration  
SELECT 
  'orders' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id,
  COUNT(*) - COUNT(organization_id) as records_missing_org_id
FROM orders;

-- Check organization distribution
SELECT 
  o.name as organization_name,
  (SELECT COUNT(*) FROM clients WHERE organization_id = o.organization_id) as client_count,
  (SELECT COUNT(*) FROM orders WHERE organization_id = o.organization_id) as order_count
FROM organizations o;