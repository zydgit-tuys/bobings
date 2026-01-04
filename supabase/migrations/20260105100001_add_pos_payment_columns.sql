-- Add new columns for POS Payment & Journaling
-- discount_amount: To track order-level discount
-- payment_method: To track 'cash', 'transfer', 'qris', etc.
-- payment_account_id: To link to specific COA (e.g., Bank BCA)

ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN sales_orders.discount_amount IS 'Total discount applied to the order';
COMMENT ON COLUMN sales_orders.payment_method IS 'Method: cash, transfer, qris, etc.';
COMMENT ON COLUMN sales_orders.payment_account_id IS 'Specific asset account (Cash/Bank) where payment was received';
