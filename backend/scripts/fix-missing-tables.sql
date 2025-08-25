-- Fix Missing organization_id for clients and orders tables
-- Run this in Supabase SQL Editor to complete the migration

-- ========================================
-- Add organization_id to clients table
-- ========================================

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(organization_id);

-- Migrate existing clients to the default organization (if any exist)
UPDATE clients 
SET organization_id = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4'
WHERE organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN clients.organization_id IS 'Organization that owns this client record';

-- ========================================
-- Add organization_id to orders table
-- ========================================

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(organization_id);

-- Migrate existing orders to the default organization (if any exist)
UPDATE orders 
SET organization_id = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4'
WHERE organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.organization_id IS 'Organization that owns this order record';

-- ========================================
-- Add RLS policies for these tables
-- ========================================

-- Enable RLS on clients and orders
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for clients
CREATE POLICY IF NOT EXISTS "Users can only access their organization's clients" 
ON clients FOR ALL 
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = auth.uid() 
      AND uo.is_active = true
  )
);

-- Create RLS policy for orders
CREATE POLICY IF NOT EXISTS "Users can only access their organization's orders" 
ON orders FOR ALL 
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = auth.uid() 
      AND uo.is_active = true
  )
);

-- ========================================
-- Verification
-- ========================================

-- Check that columns were added
SELECT 
  'clients' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id
FROM clients
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id
FROM orders;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ clients and orders tables updated successfully!';
  RAISE NOTICE '✅ RLS policies added for data isolation';
  RAISE NOTICE '🎉 SaaS Migration is now complete!';
END $$;