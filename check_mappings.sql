
-- Check current settings
SELECT * FROM app_settings WHERE setting_key LIKE 'account_%';

-- Check available accounts to find IDs for mapping
SELECT id, code, name, type FROM chart_of_accounts ORDER BY code;
