-- Add external_product_id column to products table
-- This column allows products to reference external product systems/IDs

-- Add external_product_id column as optional varchar field
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(100);

-- Add index for external_product_id queries
CREATE INDEX IF NOT EXISTS products_external_product_id_idx ON products(external_product_id);

-- Update existing products to have NULL external_product_id (already default)
-- No update needed as column is nullable and defaults to NULL