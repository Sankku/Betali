-- Add organization_id column to orders table for multi-tenant support
-- This enables proper data isolation for orders in the SaaS model

BEGIN;

-- Check if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'organization_id'
  ) THEN
    
    -- Add organization_id column to orders table
    ALTER TABLE orders 
    ADD COLUMN organization_id UUID REFERENCES organizations(organization_id);
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
    
    -- Add comment
    COMMENT ON COLUMN orders.organization_id IS 'References the organization this order belongs to for multi-tenant data isolation';
    
    RAISE NOTICE 'Added organization_id column to orders table';
    
  ELSE
    RAISE NOTICE 'organization_id column already exists in orders table';
  END IF;
END
$$;

-- Also check and add organization_id to order_details table if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_details' 
    AND column_name = 'organization_id'
  ) THEN
    
    -- Add organization_id column to order_details table  
    ALTER TABLE order_details 
    ADD COLUMN organization_id UUID REFERENCES organizations(organization_id);
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_order_details_organization_id ON order_details(organization_id);
    
    -- Add comment
    COMMENT ON COLUMN order_details.organization_id IS 'References the organization this order detail belongs to for multi-tenant data isolation';
    
    RAISE NOTICE 'Added organization_id column to order_details table';
    
  ELSE
    RAISE NOTICE 'organization_id column already exists in order_details table';
  END IF;
END
$$;

-- Enable Row Level Security on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for orders - users can only see orders from their organization
CREATE POLICY orders_organization_isolation ON orders
  FOR ALL
  USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

-- Enable Row Level Security on order_details table  
ALTER TABLE order_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for order_details - users can only see order details from their organization
CREATE POLICY order_details_organization_isolation ON order_details
  FOR ALL
  USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

COMMIT;

-- Show summary
SELECT 
  'orders' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'organization_id'
  ) THEN '✅ Has organization_id' ELSE '❌ Missing organization_id' END as status

UNION ALL

SELECT 
  'order_details' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_details' AND column_name = 'organization_id'
  ) THEN '✅ Has organization_id' ELSE '❌ Missing organization_id' END as status;