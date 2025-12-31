
-- 1. Standardize Key Names
-- Rename 'account_penjualan_lainnya' -> 'account_penjualan'
UPDATE app_settings 
SET setting_key = 'account_penjualan' 
WHERE setting_key = 'account_penjualan_lainnya';

-- Rename 'account_piutang_marketplace' -> 'account_piutang'
UPDATE app_settings 
SET setting_key = 'account_piutang' 
WHERE setting_key = 'account_piutang_marketplace';

-- 2. Add Missing 'account_bank' Mapping
DO $$
DECLARE
  v_bank_id UUID;
BEGIN
  -- Try to find Bank BCA or any Bank
  SELECT id INTO v_bank_id FROM chart_of_accounts WHERE name ILIKE '%Bank%' LIMIT 1;
  
  IF v_bank_id IS NOT NULL THEN
    INSERT INTO app_settings (setting_key, setting_value)
    VALUES ('account_bank', v_bank_id::text)
    ON CONFLICT (setting_key) DO NOTHING;
    RAISE NOTICE 'Mapped account_bank to %, ID: %', 'Bank found', v_bank_id;
  ELSE
    RAISE NOTICE 'WARNING: No Bank account found in Chart of Accounts!';
  END IF;
END $$;

-- 3. Verify Final State
SELECT setting_key, setting_value, c.name 
FROM app_settings s 
LEFT JOIN chart_of_accounts c ON c.id::text = s.setting_value
WHERE setting_key LIKE 'account_%';
