-- Migration: Add reference_type and reference_id columns to stock_movements table
-- Date: 2025-12-20
-- Description: Adds proper foreign key reference tracking for stock movements
-- This allows tracking which purchase order, sale order, or adjustment created the movement

BEGIN;

-- Add reference_type column (enum for type of reference)
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);

-- Add reference_id column (UUID for the referenced entity)
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Add comments for documentation
COMMENT ON COLUMN stock_movements.reference_type IS 'Type of entity that created this movement (e.g., purchase_order, sales_order, adjustment)';
COMMENT ON COLUMN stock_movements.reference_id IS 'ID of the entity that created this movement';

-- Create index for faster queries by reference
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
ON stock_movements(reference_type, reference_id);

-- Optional: Migrate data from old 'reference' column to new structure if needed
-- You can uncomment this if you want to parse the old reference field
-- UPDATE stock_movements
-- SET reference_type = 'legacy',
--     reference_id = NULL
-- WHERE reference_type IS NULL AND reference IS NOT NULL;

COMMIT;

-- Rollback script (keep commented, use if needed):
-- BEGIN;
-- DROP INDEX IF EXISTS idx_stock_movements_reference;
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS reference_type;
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS reference_id;
-- COMMIT;
