-- The column 'status' is an ENUM type 'purchase_status'. we need to add 'completed' to it.
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be run inside a transaction block in some versions, 
-- but Supabase SQL editor handles it.

ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'completed' AFTER 'received';

-- If there was a check constraint explicitly defined (less likely for Enum but possible), drop it.
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_status_check;
COMMENT ON COLUMN purchases.status IS 'Status lifecycle: draft -> ordered -> received -> completed (fully paid)';
