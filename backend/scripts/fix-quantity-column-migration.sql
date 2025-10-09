-- Fix Stock Movements Quantity Column Type
-- Change quantity from INTEGER to DECIMAL to support fractional quantities

-- First, let's check the current column type
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
AND column_name = 'quantity';

-- If the column is INTEGER, change it to DECIMAL
-- This will preserve existing data and allow decimal values
ALTER TABLE stock_movements 
ALTER COLUMN quantity TYPE DECIMAL(10,4);

-- Verify the change
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
AND column_name = 'quantity';