-- Add sale_price to product_types table
-- This is the reference selling price for a product type, used to auto-populate sales orders.
-- Visible to all roles (unlike purchase_price which is admin/manager only).

ALTER TABLE product_types
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2);
