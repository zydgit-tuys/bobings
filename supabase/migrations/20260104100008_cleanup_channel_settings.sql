-- ========================================================
-- CLEANUP CHANNEL-BASED SETTINGS
-- ========================================================

-- Remove marketplace-specific revenue account settings
-- These are no longer needed - we use product-type based accounts

DELETE FROM app_settings
WHERE setting_key IN (
  'account_penjualan_shopee',
  'account_penjualan_tokopedia',
  'account_penjualan_tiktok',
  'account_penjualan_lazada',
  'account_penjualan_manual'
);

-- Keep product-based settings:
-- ✅ account_penjualan_produksi → 4001
-- ✅ account_penjualan → 4002 (default for purchased)
-- ✅ account_pendapatan_jasa → 4200

COMMENT ON TABLE app_settings IS 
'Application settings - Revenue accounts based on product type, not channel. Channel stored in sales_orders.marketplace for reporting.';

-- Log cleanup
DO $$
BEGIN
  RAISE NOTICE 'Settings Cleanup Complete:';
  RAISE NOTICE '✅ Removed 5 channel-based settings';
  RAISE NOTICE '✅ Kept 3 product-based settings';
  RAISE NOTICE '📊 Channel reporting via sales_orders.marketplace filter';
END $$;
