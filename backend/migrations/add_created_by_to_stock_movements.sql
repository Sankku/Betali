-- Migration: Add created_by column to stock_movements table
-- Date: 2025-12-20
-- Description: Adds tracking of which user created each stock movement for audit purposes

BEGIN;

-- Add created_by column to stock_movements table
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id);

-- Add comment for documentation
COMMENT ON COLUMN stock_movements.created_by IS 'User who created this stock movement (for audit trail)';

-- Create index for faster queries by created_by
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by
ON stock_movements(created_by);

-- Optional: Update existing records to set created_by to the user_id from the organization
-- This is a best-effort approach for existing data
-- Note: user_organizations.role is a text column, not an enum
UPDATE stock_movements sm
SET created_by = (
  SELECT uo.user_id
  FROM user_organizations uo
  WHERE uo.organization_id = sm.organization_id
  ORDER BY
    CASE
      WHEN uo.role::text = 'owner' THEN 1
      WHEN uo.role::text = 'admin' THEN 2
      ELSE 3
    END
  LIMIT 1
)
WHERE sm.created_by IS NULL;

COMMIT;

-- Rollback script (keep commented, use if needed):
-- BEGIN;
-- DROP INDEX IF EXISTS idx_stock_movements_created_by;
-- ALTER TABLE stock_movements DROP COLUMN IF EXISTS created_by;
-- COMMIT;
