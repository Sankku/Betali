-- Critical Orders Schema Migration
-- This migration adds the essential missing fields to make orders work properly

-- ============================================================================
-- 1. ORDERS TABLE - Critical fields
-- ============================================================================

-- Add notes column (needed by OrderService immediately)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add order_number for automatic numbering (ORD-001, ORD-002, etc.)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;

-- Add delivery_date for order fulfillment tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;

-- Add created_by for user audit trail
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);

-- ============================================================================
-- 2. ORDER_DETAILS TABLE - Critical fields  
-- ============================================================================

-- Add order_item_id as primary key (if missing)
-- First check if we need to add it as primary key or just as a column
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS order_item_id UUID DEFAULT gen_random_uuid();

-- Add warehouse_id for multi-warehouse support
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouse(warehouse_id);

-- Add unit_price to store price per unit at time of order
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add line_total for calculated line totals (quantity * unit_price)  
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- ============================================================================
-- 3. INDEXES for performance
-- ============================================================================

-- Order number index for quick lookups
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);

-- Order date index for date range queries
CREATE INDEX IF NOT EXISTS orders_order_date_idx ON orders(order_date);

-- Order status index for filtering
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

-- Organization index for multi-tenant queries
CREATE INDEX IF NOT EXISTS orders_organization_id_idx ON orders(organization_id);

-- Order details indexes
CREATE INDEX IF NOT EXISTS order_details_order_id_idx ON order_details(order_id);
CREATE INDEX IF NOT EXISTS order_details_product_id_idx ON order_details(product_id);
CREATE INDEX IF NOT EXISTS order_details_organization_id_idx ON order_details(organization_id);

-- ============================================================================
-- 4. UPDATE existing data to have proper structure
-- ============================================================================

-- Generate order numbers for existing orders (if any)
UPDATE orders 
SET order_number = 'ORD-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0')
WHERE order_number IS NULL;

-- Update line totals for existing order details (if any)
UPDATE order_details 
SET line_total = quantity * unit_price 
WHERE line_total = 0 AND unit_price > 0;

-- Set created_by to user_id for existing orders where possible
UPDATE orders 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;