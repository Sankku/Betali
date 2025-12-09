-- ============================================================================
-- Migration 007: Create Purchase Orders Tables
-- Description: Purchase orders system for managing inventory purchases
-- Created: 2025-12-08
-- ============================================================================

-- ============================================================================
-- 1. CREATE SUPPLIERS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  supplier_id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id),
  CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(user_id)
) TABLESPACE pg_default;

-- Indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id
  ON public.suppliers USING btree (organization_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_suppliers_name
  ON public.suppliers USING btree (name) TABLESPACE pg_default;

-- ============================================================================
-- 2. CREATE PURCHASE ORDERS TABLE
-- ============================================================================
CREATE TABLE public.purchase_orders (
  purchase_order_id UUID NOT NULL DEFAULT gen_random_uuid(),
  supplier_id UUID NULL,
  warehouse_id UUID NULL,
  organization_id UUID NOT NULL,
  branch_id UUID NULL,
  user_id UUID NULL,
  created_by UUID NULL,

  -- Order details
  purchase_order_number VARCHAR(50) NULL,
  order_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expected_delivery_date DATE NULL,
  received_date TIMESTAMP WITHOUT TIME ZONE NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- Pricing
  subtotal NUMERIC(15, 2) DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) DEFAULT 0.00,
  shipping_amount NUMERIC(15, 2) DEFAULT 0.00,
  total NUMERIC(15, 2) DEFAULT 0.00,

  -- Additional info
  notes TEXT NULL,

  -- Timestamps
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

  CONSTRAINT purchase_orders_pkey PRIMARY KEY (purchase_order_id),
  CONSTRAINT purchase_orders_number_key UNIQUE (purchase_order_number),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id)
    REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  CONSTRAINT purchase_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id)
    REFERENCES warehouse(warehouse_id) ON DELETE SET NULL,
  CONSTRAINT purchase_orders_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id)
    REFERENCES branches(branch_id) ON DELETE SET NULL,
  CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users(user_id),
  CONSTRAINT purchase_orders_status_check CHECK (
    status IN ('draft', 'pending', 'approved', 'received', 'partially_received', 'cancelled')
  )
) TABLESPACE pg_default;

-- Indexes for purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id
  ON public.purchase_orders USING btree (organization_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_branch
  ON public.purchase_orders USING btree (organization_id, branch_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date
  ON public.purchase_orders USING btree (order_date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_number
  ON public.purchase_orders USING btree (purchase_order_number) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON public.purchase_orders USING btree (supplier_id) TABLESPACE pg_default;

-- ============================================================================
-- 3. CREATE PURCHASE ORDER DETAILS TABLE
-- ============================================================================
CREATE TABLE public.purchase_order_details (
  detail_id UUID NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Quantities
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),

  -- Pricing
  unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),

  -- Additional info
  notes TEXT NULL,

  -- Timestamps
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

  CONSTRAINT purchase_order_details_pkey PRIMARY KEY (detail_id),
  CONSTRAINT purchase_order_details_purchase_order_id_fkey FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  CONSTRAINT purchase_order_details_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES products(product_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_order_details_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  CONSTRAINT check_received_quantity CHECK (received_quantity <= quantity)
) TABLESPACE pg_default;

-- Indexes for purchase_order_details
CREATE INDEX IF NOT EXISTS idx_purchase_order_details_order_id
  ON public.purchase_order_details USING btree (purchase_order_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_order_details_product_id
  ON public.purchase_order_details USING btree (product_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_purchase_order_details_organization_id
  ON public.purchase_order_details USING btree (organization_id) TABLESPACE pg_default;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_org_isolation ON public.suppliers
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Enable RLS on purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_org_isolation ON public.purchase_orders
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Enable RLS on purchase_order_details
ALTER TABLE public.purchase_order_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_details_org_isolation ON public.purchase_order_details
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- ============================================================================
-- 5. TRIGGER FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for purchase_orders
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. FUNCTION TO GENERATE PURCHASE ORDER NUMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_purchase_order_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  next_number INTEGER;
  po_number VARCHAR(50);
BEGIN
  -- Get the next sequential number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_order_number FROM 'PO-[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE organization_id = org_id
    AND purchase_order_number ~ 'PO-[0-9]+$';

  -- Format: PO-000001
  po_number := 'PO-' || LPAD(next_number::TEXT, 6, '0');

  RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER TO AUTO-GENERATE PURCHASE ORDER NUMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_order_number IS NULL THEN
    NEW.purchase_order_number := generate_purchase_order_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_po_number ON public.purchase_orders;
CREATE TRIGGER trigger_auto_generate_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_po_number();

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.suppliers IS 'Stores supplier information for purchase orders';
COMMENT ON TABLE public.purchase_orders IS 'Main purchase orders table - orders placed to suppliers';
COMMENT ON TABLE public.purchase_order_details IS 'Line items for each purchase order';

COMMENT ON COLUMN public.purchase_orders.status IS 'Purchase order status: draft, pending, approved, received, partially_received, cancelled';
COMMENT ON COLUMN public.purchase_order_details.received_quantity IS 'Quantity already received from this purchase order line';

-- ============================================================================
-- END OF MIGRATION 007
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed successfully!';
  RAISE NOTICE 'Created tables: suppliers, purchase_orders, purchase_order_details';
  RAISE NOTICE 'Created indexes, RLS policies, and triggers';
END $$;
