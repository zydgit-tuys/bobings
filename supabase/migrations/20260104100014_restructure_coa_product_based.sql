-- ========================================================
-- COA RESTRUCTURING - PRODUCT-BASED REVENUE
-- ========================================================

-- 1. Add new account types to enum
DO $$ 
BEGIN
    -- Add contra_revenue if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'contra_revenue' 
        AND enumtypid = 'account_type'::regtype
    ) THEN
        ALTER TYPE account_type ADD VALUE 'contra_revenue';
    END IF;
    
    -- Add other_income if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'other_income' 
        AND enumtypid = 'account_type'::regtype
    ) THEN
        ALTER TYPE account_type ADD VALUE 'other_income';
    END IF;
END $$;

-- 2. Fix account classifications

-- Fix Diskon Penjualan: revenue → contra_revenue
UPDATE chart_of_accounts
SET account_type = 'contra_revenue'
WHERE code = '6010';

-- Fix Keuntungan Selisih Stock: revenue → other_income
UPDATE chart_of_accounts
SET 
  account_type = 'other_income',
  name = 'Pendapatan Selisih Stok'
WHERE code = '7-101';

-- 3. Deactivate channel-based revenue accounts
-- These are redundant - channel is stored in sales_orders.marketplace

UPDATE chart_of_accounts
SET is_active = false
WHERE code IN (
  '4101', -- Penjualan Marketplace – Shopee
  '4102', -- Penjualan Marketplace – Tokopedia
  '4103', -- Penjualan Marketplace – TikTok
  '4104', -- Penjualan Marketplace – Lazada
  '4201'  -- Penjualan Manual / Offline
);

-- 4. Add comments for clarity
COMMENT ON COLUMN chart_of_accounts.account_type IS 
'Account type: asset, liability, equity, revenue, expense, contra_revenue, other_income';

COMMENT ON TABLE chart_of_accounts IS 
'Chart of Accounts - Product-based revenue structure (Production/Purchased/Service). Channel stored in transaction attributes.';

-- 5. Log changes
DO $$
BEGIN
  RAISE NOTICE 'COA Restructuring Complete:';
  RAISE NOTICE '✅ Added account types: contra_revenue, other_income';
  RAISE NOTICE '✅ Fixed 6010 → contra_revenue';
  RAISE NOTICE '✅ Fixed 7-101 → other_income';
  RAISE NOTICE '✅ Deactivated 5 channel-based accounts (4101-4104, 4201)';
  RAISE NOTICE '✅ Active revenue accounts: 4001 (Production), 4002 (Purchased), 4200 (Service)';
END $$;
