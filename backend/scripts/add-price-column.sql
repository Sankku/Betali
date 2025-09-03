-- Add price column to products table
-- This migration adds a price column to store product pricing

-- Add price column with default value of 0
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00;

-- Add constraint to ensure price is not negative  
ALTER TABLE products 
ADD CONSTRAINT products_price_positive CHECK (price >= 0);

-- Add index for price queries
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);

-- Update existing products to have a default price if needed
UPDATE products 
SET price = 0.00 
WHERE price IS NULL;