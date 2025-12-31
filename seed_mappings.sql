
-- Function to safely update a setting if the account exists
CREATE OR REPLACE FUNCTION set_account_mapping(p_key TEXT, p_account_name_pattern TEXT) 
RETURNS void AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Find account ID (case-insensitive, partial match)
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE name ILIKE p_account_name_pattern 
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    -- Insert or Update setting
    INSERT INTO app_settings (setting_key, setting_value)
    VALUES (p_key, v_account_id::text)
    ON CONFLICT (setting_key) 
    DO UPDATE SET setting_value = EXCLUDED.setting_value;
    
    RAISE NOTICE 'Mapped % to Account ID %', p_key, v_account_id;
  ELSE
    RAISE NOTICE 'WARNING: Could not find account matching pattern "%" for key %', p_account_name_pattern, p_key;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute Mappings (Adjust patterns as needed for your specific CoA names)
SELECT set_account_mapping('account_kas', 'Kas%');           -- Matches 'Kas', 'Kas Besar', etc.
SELECT set_account_mapping('account_bank', 'Bank%');         -- Matches 'Bank BCA', 'Bank Mandiri'
SELECT set_account_mapping('account_persediaan', 'Persediaan%'); -- Matches 'Persediaan Barang'
SELECT set_account_mapping('account_hutang_supplier', 'Hutang%'); -- Matches 'Hutang Usaha', 'Hutang Supplier'
SELECT set_account_mapping('account_biaya_penyesuaian_stok', 'Biaya Penyesuaian%'); -- Matches 'Biaya Penyesuaian Stok'
SELECT set_account_mapping('account_biaya_admin', 'Biaya Admin%'); -- Matches 'Biaya Admin', 'Admin Fee'
SELECT set_account_mapping('account_biaya_admin', 'Admin Fee%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_biaya_admin');

-- Fallbacks if specific names fail (try English)
SELECT set_account_mapping('account_kas', 'Cash%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_kas');
SELECT set_account_mapping('account_persediaan', 'Inventory%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_persediaan');
SELECT set_account_mapping('account_hutang_supplier', 'Accounts Payable%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_hutang_supplier');

-- NEW: Generic / Fallback Mappings
SELECT set_account_mapping('account_penjualan', 'Penjualan%'); -- Matches 'Penjualan', 'Sales'
SELECT set_account_mapping('account_penjualan', 'Sales%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_penjualan');

SELECT set_account_mapping('account_piutang', 'Piutang Usaha%');
SELECT set_account_mapping('account_piutang', 'Accounts Receivable%') WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE setting_key='account_piutang');

-- NEW: Misc Mappings
SELECT set_account_mapping('account_retur_penjualan', 'Retur Penjualan%');
SELECT set_account_mapping('account_diskon_penjualan', 'Diskon Penjualan%');
SELECT set_account_mapping('account_pendapatan_ongkir', 'Pendapatan Ongkir%');

-- Verify results
SELECT s.setting_key, c.code, c.name 
FROM app_settings s
JOIN chart_of_accounts c ON s.setting_value::uuid = c.id
WHERE s.setting_key LIKE 'account_%';

-- Clean up function
DROP FUNCTION set_account_mapping(TEXT, TEXT);
