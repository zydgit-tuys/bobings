-- ========================================================
-- CLEANUP UNUSED CHART OF ACCOUNTS
-- ========================================================
-- This script deletes accounts that are:
-- 1. Not used in Journal Mappings (V2)
-- 2. Not used in Journal Lines (History)
-- 3. Not referenced in Bank Accounts
-- 4. Not used in App Settings (V1)
-- 5. Not a Parent of another account (Leaf nodes only)

DO $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM chart_of_accounts
    WHERE id NOT IN (
        -- 1. Referenced in Journal Mappings
        SELECT account_id FROM journal_account_mappings
    )
    AND id NOT IN (
        -- 2. Referenced in Journal Lines (History resilience)
        SELECT account_id FROM journal_lines
    )
    AND id NOT IN (
        -- 3. Linked to Bank Accounts
        SELECT account_id FROM bank_accounts WHERE account_id IS NOT NULL
    )
    AND id::text NOT IN (
        -- 4. Used in App Settings (Robust check for UUID format)
        SELECT setting_value 
        FROM app_settings 
        WHERE setting_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND id NOT IN (
        -- 5. Is a Parent (Do not delete parents, to avoid orphans)
        SELECT DISTINCT parent_id 
        FROM chart_of_accounts 
        WHERE parent_id IS NOT NULL
    );

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Successfully deleted % unused accounts.', v_deleted_count;
    
    IF v_deleted_count = 0 THEN
        RAISE NOTICE 'ℹ️ No unused leaf accounts found.';
    END IF;
END $$;
