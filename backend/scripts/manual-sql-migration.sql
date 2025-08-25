-- Manual SQL Migration for SaaS Architecture
-- Run this in Supabase SQL Editor or psql to complete the migration
-- IMPORTANT: Make sure you have a database backup before running this!

-- ========================================
-- STEP 1: Add organization ownership
-- ========================================

-- Add owner_user_id column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(user_id);

-- Set the current organization owner (FACYT S.A. → betali.business@gmail.com)
UPDATE organizations 
SET owner_user_id = '4ef37216-5711-403a-96e9-5a2fdd286d85'
WHERE organization_id = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4'
  AND owner_user_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_user_id 
ON organizations(owner_user_id);

-- Add comment for documentation
COMMENT ON COLUMN organizations.owner_user_id IS 'User who owns and can manage this organization';

-- ========================================
-- STEP 2: Add organization_id to clients table
-- ========================================

-- Add organization_id column
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

-- Eventually add NOT NULL constraint (after confirming migration)
-- ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;

-- ========================================
-- STEP 3: Add organization_id to orders table
-- ========================================

-- Add organization_id column
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

-- Eventually add NOT NULL constraint (after confirming migration)
-- ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;

-- ========================================
-- STEP 4: Add organization_id to order_details (if exists)
-- ========================================

-- Check if order_details table exists and add organization_id
DO $$ 
BEGIN
  -- Check if order_details table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_details') THEN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_details' AND column_name = 'organization_id') THEN
      ALTER TABLE order_details ADD COLUMN organization_id uuid REFERENCES organizations(organization_id);
      
      -- Migrate existing order_details via their parent orders
      UPDATE order_details 
      SET organization_id = (
        SELECT o.organization_id 
        FROM orders o 
        WHERE o.order_id = order_details.order_id
      )
      WHERE organization_id IS NULL;
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_order_details_organization_id ON order_details(organization_id);
      
      -- Add comment for documentation
      COMMENT ON COLUMN order_details.organization_id IS 'Organization that owns this order detail record';
      
      RAISE NOTICE 'Added organization_id to order_details table';
    ELSE
      RAISE NOTICE 'order_details already has organization_id column';
    END IF;
  ELSE
    RAISE NOTICE 'order_details table does not exist';
  END IF;
END $$;

-- ========================================
-- STEP 5: Create Row Level Security (RLS) policies
-- ========================================

-- Enable RLS on all business tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for products
CREATE POLICY IF NOT EXISTS "Users can only access their organization's products" 
ON products FOR ALL 
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = auth.uid() 
      AND uo.is_active = true
  )
);

-- Create RLS policy for warehouse
CREATE POLICY IF NOT EXISTS "Users can only access their organization's warehouses" 
ON warehouse FOR ALL 
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = auth.uid() 
      AND uo.is_active = true
  )
);

-- Create RLS policy for stock_movements
CREATE POLICY IF NOT EXISTS "Users can only access their organization's stock movements" 
ON stock_movements FOR ALL 
USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo 
    WHERE uo.user_id = auth.uid() 
      AND uo.is_active = true
  )
);

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

-- RLS policy for order_details (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_details') THEN
    ALTER TABLE order_details ENABLE ROW LEVEL SECURITY;
    
    -- Use a DROP/CREATE pattern to ensure policy is updated
    DROP POLICY IF EXISTS "Users can only access their organization's order details" ON order_details;
    
    CREATE POLICY "Users can only access their organization's order details" 
    ON order_details FOR ALL 
    USING (
      organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo 
        WHERE uo.user_id = auth.uid() 
          AND uo.is_active = true
      )
    );
    
    RAISE NOTICE 'RLS enabled for order_details';
  END IF;
END $$;

-- ========================================
-- STEP 6: Verification queries
-- ========================================

-- Verify organization ownership
SELECT 
  o.name as organization_name,
  o.owner_user_id,
  u.email as owner_email,
  u.name as owner_name
FROM organizations o
LEFT JOIN users u ON o.owner_user_id = u.user_id;

-- Verify all business tables have organization_id
SELECT 
  'products' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id
FROM products
UNION ALL
SELECT 
  'warehouse',
  COUNT(*),
  COUNT(organization_id)
FROM warehouse
UNION ALL
SELECT 
  'stock_movements',
  COUNT(*),
  COUNT(organization_id)
FROM stock_movements
UNION ALL
SELECT 
  'clients',
  COUNT(*),
  COUNT(organization_id)
FROM clients
UNION ALL
SELECT 
  'orders',
  COUNT(*),
  COUNT(organization_id)
FROM orders;

-- Verify RLS policies are active
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'warehouse', 'stock_movements', 'clients', 'orders', 'order_details')
ORDER BY tablename, policyname;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SaaS Multi-tenant Migration Completed Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Organization ownership added';
  RAISE NOTICE '✅ Business tables updated with organization_id';
  RAISE NOTICE '✅ Row Level Security policies created';
  RAISE NOTICE '✅ Database indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '1. Update application code to use new architecture';
  RAISE NOTICE '2. Test multi-tenant functionality';
  RAISE NOTICE '3. Enable NOT NULL constraints on organization_id columns';
  RAISE NOTICE '';
END $$;