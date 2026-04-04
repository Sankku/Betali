-- Add sale_price to product_lots table
-- The existing `price` field is the purchase/cost price (restricted to admin/manager).
-- `sale_price` is the selling price, visible to all roles.

ALTER TABLE product_lots
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2);
