-- 015_add_lot_id_to_purchase_order_details.sql
-- Adds lot_id FK to purchase_order_details so each received line tracks which lot it was assigned to

ALTER TABLE purchase_order_details
  ADD COLUMN IF NOT EXISTS lot_id UUID
    REFERENCES product_lots(lot_id)
    ON DELETE SET NULL;

COMMENT ON COLUMN purchase_order_details.lot_id IS
  'Lot assigned to this line on first reception. NULL until the line is first received.';
