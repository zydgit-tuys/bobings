-- SEED ACCOUNTING CONFIGURATION
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_kas_id UUID;
  v_persediaan_id UUID;
  v_hutang_id UUID;
BEGIN
  -- 1. Ensure Chart of Accounts exist and get their IDs
  
  -- 1.1 KAS (Asset)
  INSERT INTO chart_of_accounts (code, name, account_type, is_active)
  VALUES ('1000', 'Kas', 'asset', true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_kas_id;

  -- 1.2 PERSEDIAAN (Asset)
  INSERT INTO chart_of_accounts (code, name, account_type, is_active)
  VALUES ('1020', 'Persediaan Barang', 'asset', true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_persediaan_id;

  -- 1.3 HUTANG SUPPLIER (Liability)
  INSERT INTO chart_of_accounts (code, name, account_type, is_active)
  VALUES ('2001', 'Hutang Usaha', 'liability', true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_hutang_id;

  -- 2. Configure App Settings with these IDs
  
  -- 2.1 account_kas
  INSERT INTO app_settings (setting_key, setting_value)
  VALUES ('account_kas', v_kas_id::text)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

  -- 2.2 account_persediaan
  INSERT INTO app_settings (setting_key, setting_value)
  VALUES ('account_persediaan', v_persediaan_id::text)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

  -- 2.3 account_hutang_supplier
  INSERT INTO app_settings (setting_key, setting_value)
  VALUES ('account_hutang_supplier', v_hutang_id::text)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

END $$;
