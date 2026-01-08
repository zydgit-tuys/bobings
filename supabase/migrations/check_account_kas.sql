-- Check if account_kas is configured in app_settings
SELECT 
    setting_key,
    setting_value,
    (SELECT code || ' - ' || name FROM chart_of_accounts WHERE id = setting_value::uuid) AS account_info
FROM app_settings
WHERE setting_key = 'account_kas';

-- If not found, we need to configure it
-- Recommended: Use account code 1001 (Kas)
-- INSERT INTO app_settings (setting_key, setting_value)
-- SELECT 'account_kas', id::text
-- FROM chart_of_accounts
-- WHERE code = '1001';
