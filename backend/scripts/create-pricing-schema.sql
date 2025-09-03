-- Advanced Pricing & Tax Management System Schema
-- This migration adds comprehensive pricing, tax, and discount functionality

-- ============================================================================
-- 1. PRICING TIERS TABLE - Volume-based pricing
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  pricing_tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  tier_name VARCHAR(100) NOT NULL,
  min_quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  max_quantity DECIMAL(10,3) NULL, -- NULL means unlimited
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL, -- NULL means no expiration
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for pricing tiers
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_org ON pricing_tiers(product_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_quantity ON pricing_tiers(min_quantity, max_quantity);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_dates ON pricing_tiers(valid_from, valid_to);

-- ============================================================================
-- 2. CUSTOMER PRICING TABLE - Customer-specific pricing
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_pricing (
  customer_pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  client_id UUID NOT NULL REFERENCES clients(client_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Unique constraint to prevent duplicate customer-product pricing
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_pricing_unique 
ON customer_pricing(client_id, product_id, organization_id) 
WHERE is_active = true;

-- Indexes for customer pricing
CREATE INDEX IF NOT EXISTS idx_customer_pricing_client ON customer_pricing(client_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_product ON customer_pricing(product_id, organization_id);

-- ============================================================================
-- 3. TAX RATES TABLE - Configurable tax rates
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  tax_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rate DECIMAL(8,6) NOT NULL, -- e.g., 0.165000 for 16.5%
  is_inclusive BOOLEAN DEFAULT false, -- true if tax is included in price
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for tax rates
CREATE INDEX IF NOT EXISTS idx_tax_rates_org ON tax_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_active ON tax_rates(organization_id, is_active);

-- ============================================================================
-- 4. PRODUCT TAX GROUPS TABLE - Assign tax rates to products
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_tax_groups (
  product_tax_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  tax_rate_id UUID NOT NULL REFERENCES tax_rates(tax_rate_id),
  created_at TIMESTAMP DEFAULT now()
);

-- Unique constraint to prevent duplicate product-tax assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_tax_unique 
ON product_tax_groups(product_id, tax_rate_id, organization_id);

-- Indexes for product tax groups
CREATE INDEX IF NOT EXISTS idx_product_tax_product ON product_tax_groups(product_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_product_tax_rate ON product_tax_groups(tax_rate_id);

-- ============================================================================
-- 5. DISCOUNT RULES TABLE - Flexible discount system
-- ============================================================================

CREATE TABLE IF NOT EXISTS discount_rules (
  discount_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
  value DECIMAL(10,2) NOT NULL, -- percentage (0.10 for 10%) or fixed amount
  applies_to VARCHAR(50) NOT NULL DEFAULT 'order' CHECK (applies_to IN ('order', 'line_item', 'shipping')),
  
  -- Conditions
  min_order_amount DECIMAL(10,2) NULL,
  max_discount_amount DECIMAL(10,2) NULL,
  min_quantity INTEGER NULL,
  
  -- Coupon system
  coupon_code VARCHAR(50) NULL,
  requires_coupon BOOLEAN DEFAULT false,
  
  -- Usage limits
  max_uses INTEGER NULL, -- NULL means unlimited
  max_uses_per_customer INTEGER NULL,
  current_uses INTEGER DEFAULT 0,
  
  -- Date range
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL,
  
  -- Metadata
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Unique constraint for coupon codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_coupon_unique 
ON discount_rules(coupon_code, organization_id) 
WHERE coupon_code IS NOT NULL AND is_active = true;

-- Indexes for discount rules
CREATE INDEX IF NOT EXISTS idx_discount_rules_org ON discount_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON discount_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_dates ON discount_rules(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_discount_rules_coupon ON discount_rules(coupon_code) WHERE coupon_code IS NOT NULL;

-- ============================================================================
-- 6. DISCOUNT RULE PRODUCTS TABLE - Product-specific discounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS discount_rule_products (
  discount_rule_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  discount_rule_id UUID NOT NULL REFERENCES discount_rules(discount_rule_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  created_at TIMESTAMP DEFAULT now()
);

-- Unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_rule_product_unique 
ON discount_rule_products(discount_rule_id, product_id, organization_id);

-- ============================================================================
-- 7. APPLIED DISCOUNTS TABLE - Audit trail for discount usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS applied_discounts (
  applied_discount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  order_id UUID NOT NULL REFERENCES orders(order_id),
  discount_rule_id UUID NOT NULL REFERENCES discount_rules(discount_rule_id),
  discount_amount DECIMAL(10,2) NOT NULL,
  applied_to VARCHAR(50) NOT NULL DEFAULT 'order', -- 'order', 'line_item', 'shipping'
  order_line_id UUID NULL, -- Reference to specific line item if applicable
  coupon_code VARCHAR(50) NULL,
  applied_at TIMESTAMP DEFAULT now()
);

-- Indexes for applied discounts
CREATE INDEX IF NOT EXISTS idx_applied_discounts_order ON applied_discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_rule ON applied_discounts(discount_rule_id);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_org_date ON applied_discounts(organization_id, applied_at);

-- ============================================================================
-- 8. UPDATE ORDERS TABLE - Add pricing fields
-- ============================================================================

-- Add new pricing fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0.00;

-- Update existing orders to have proper pricing structure
UPDATE orders 
SET subtotal = total_price, tax_amount = 0.00, discount_amount = 0.00, total = total_price 
WHERE subtotal IS NULL OR subtotal = 0.00;

-- ============================================================================
-- 9. UPDATE ORDER_DETAILS TABLE - Add pricing fields
-- ============================================================================

-- Add new pricing fields to order_details table
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS line_total DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00;

-- Update existing order details to use current price field as unit_price
UPDATE order_details 
SET unit_price = price, line_total = (price * quantity), discount_amount = 0.00, tax_amount = 0.00
WHERE unit_price IS NULL OR unit_price = 0.00;

-- ============================================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all pricing tables
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tax_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rule_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_discounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization isolation
CREATE POLICY pricing_tiers_org_policy ON pricing_tiers
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY customer_pricing_org_policy ON customer_pricing
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY tax_rates_org_policy ON tax_rates
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY product_tax_groups_org_policy ON product_tax_groups
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY discount_rules_org_policy ON discount_rules
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY discount_rule_products_org_policy ON discount_rule_products
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

CREATE POLICY applied_discounts_org_policy ON applied_discounts
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );

-- ============================================================================
-- 11. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Sample tax rates
INSERT INTO tax_rates (organization_id, name, description, rate, is_inclusive) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Standard Tax', 'Standard tax rate', 0.16, false),
  ('00000000-0000-0000-0000-000000000001', 'Reduced Tax', 'Reduced tax rate for essentials', 0.08, false),
  ('00000000-0000-0000-0000-000000000001', 'Zero Tax', 'Tax-free items', 0.00, false)
ON CONFLICT DO NOTHING;

-- Sample discount rules
INSERT INTO discount_rules (organization_id, name, description, type, value, min_order_amount)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Volume Discount 10%', '10% off orders over $100', 'percentage', 0.10, 100.00),
  ('00000000-0000-0000-0000-000000000001', 'New Customer $20 Off', '$20 off for new customers', 'fixed_amount', 20.00, 50.00),
  ('00000000-0000-0000-0000-000000000001', 'Summer Sale', '15% off everything', 'percentage', 0.15, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. SUMMARY QUERY
-- ============================================================================

-- Show summary of created tables
SELECT 
  'pricing_tiers' as table_name,
  'Volume-based pricing tiers' as description
UNION ALL
SELECT 'customer_pricing', 'Customer-specific pricing'
UNION ALL  
SELECT 'tax_rates', 'Configurable tax rates'
UNION ALL
SELECT 'product_tax_groups', 'Product tax assignments'
UNION ALL
SELECT 'discount_rules', 'Flexible discount system'
UNION ALL
SELECT 'discount_rule_products', 'Product-specific discounts'
UNION ALL
SELECT 'applied_discounts', 'Discount usage audit trail';