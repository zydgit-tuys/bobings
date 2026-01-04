-- ========================================================
-- ADD REVENUE ACCOUNT SETTINGS FOR PRODUCT TYPES
-- ========================================================

-- Add setting for Production Sales Revenue
INSERT INTO app_settings (setting_key, setting_value, description)
SELECT 'account_penjualan_produksi', id, 'Account untuk Penjualan Produk Produksi'
FROM chart_of_accounts
WHERE code = '4001'
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- Add setting for Manual/Offline Sales Revenue
INSERT INTO app_settings (setting_key, setting_value, description)
SELECT 'account_penjualan_manual', id, 'Account untuk Penjualan Manual / Offline'
FROM chart_of_accounts
WHERE code = '4201'
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- Add setting for Service Revenue
INSERT INTO app_settings (setting_key, setting_value, description)
SELECT 'account_pendapatan_jasa', id, 'Account untuk Pendapatan Jasa'
FROM chart_of_accounts
WHERE code = '4200'
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

COMMENT ON TABLE app_settings IS 
'Application settings including revenue account mappings by product type';
