-- Migration: Add notes column to stock_movements table
-- Date: 2025-12-20
-- Description: Adds notes field to track additional information about stock movements

BEGIN;

-- Add notes column to stock_movements table
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN stock_movements.notes IS 'Additional notes or description for this stock movement';

COMMIT;

-- Rollback script (keep commented, use if needed):
-- BEGIN;
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS notes;
-- COMMIT;
