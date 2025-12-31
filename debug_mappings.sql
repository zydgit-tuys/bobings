
-- 1. Check if the seed accounts actually exist (Did user run seed_coa.sql?)
SELECT code, name, id FROM chart_of_accounts WHERE name ILIKE 'Kas%' OR name ILIKE 'Bank%' OR name ILIKE 'Persediaan%' OR name ILIKE 'Hutang%';

-- 2. Check if the settings are actually populated (Did user run seed_mappings.sql AFTER seed_coa?)
SELECT setting_key, setting_value 
FROM app_settings 
WHERE setting_key IN (
  'account_kas', 
  'account_bank', 
  'account_persediaan', 
  'account_hutang_supplier',
  'account_penjualan',
  'account_hpp'
);

-- 3. Check for Account Mismatch
-- If settings exist, do the IDs actually point to valid accounts?
SELECT s.setting_key, s.setting_value, c.name as mapped_account_name
FROM app_settings s
LEFT JOIN chart_of_accounts c ON c.id::text = s.setting_value
WHERE s.setting_key LIKE 'account_%';
