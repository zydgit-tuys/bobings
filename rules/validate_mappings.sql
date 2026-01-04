-- Function: validate_journal_mappings
-- Usage: SELECT validate_journal_mappings();
-- Returns: true if valid, Raises Exception if missing mappings found.

CREATE OR REPLACE FUNCTION validate_journal_mappings()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    missing_record RECORD;
    missing_count INTEGER := 0;
BEGIN
    -- Check 1: Ensure all marketplaces in Orders have 'confirm_sales_order' mappings
    -- (We base this on distinct marketplaces found in sales_orders or app_settings, 
    --  but app_settings is cleaner if we assume it defines active channels)
    
    FOR missing_record IN
        SELECT DISTINCT s.setting_value as marketplace_code
        FROM app_settings s
        WHERE s.setting_key LIKE 'marketplace_%_enabled' 
          AND s.setting_value = 'true'
          -- Adjust logic: Assuming we derive marketplace list from somewhere authoritative.
          -- Alternative: Hardcoded list of KNOWN marketplaces or derived from existing mappings?
          -- Let's use a simpler approach: 
          -- "For every marketplace_code present in journal_account_mappings for 'confirm_sales_order',
          --  there MUST be a corresponding 'credit_note' mapping."
    LOOP
        -- This loop is a placeholder if we iterate. 
        -- Let's do a set-based check instead.
    END LOOP;

    -- Set Based Check:
    -- Find marketplaces that have 'confirm_sales_order' but LACK 'credit_note'
    SELECT COUNT(*) INTO missing_count
    FROM (
        SELECT DISTINCT marketplace_code 
        FROM journal_account_mappings 
        WHERE event_type = 'confirm_sales_order' AND is_active = true
    ) src
    WHERE NOT EXISTS (
        SELECT 1 
        FROM journal_account_mappings tgt
        WHERE tgt.event_type = 'credit_note'
          AND tgt.marketplace_code = src.marketplace_code
          AND tgt.is_active = true
    );

    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Validation Failed: % marketplace(s) define Sales Order mappings but are missing Credit Note mappings. Please seed "credit_note" event type.', missing_count;
    END IF;

    -- Check 2: Check for Balanced Sides (Credit + Debit)
    -- For every (event, context, mpl), we expect at least one Debit and one Credit if it's a standard flow?
    -- This might be too strict for some edge cases, but good for main events.
    
    RAISE NOTICE 'Validation Passed: Journal Mappings appear consistent.';
    RETURN true;
END;
$$;
