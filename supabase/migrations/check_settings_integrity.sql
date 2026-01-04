-- DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to check why Auto-Journal might fail

SELECT 
    s.setting_key, 
    s.setting_value AS "Account ID (in Settings)",
    c.code AS "Account Code",
    c.name AS "Account Name",
    CASE 
        WHEN c.id IS NOT NULL THEN '✅ Valid' 
        ELSE '❌ INVALID ID (Not found in Chart of Accounts)' 
    END AS "Status"
FROM app_settings s
LEFT JOIN chart_of_accounts c ON s.setting_value::uuid = c.id
WHERE s.setting_key IN ('account_persediaan', 'account_hutang_supplier', 'account_kas');
