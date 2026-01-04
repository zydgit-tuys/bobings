-- SEED V2 MAPPINGS FOR PURCHASE
DO $$
DECLARE
    -- Accounts
    acc_persediaan uuid;
    acc_hutang uuid;
BEGIN
    -- 1. Lookup Account IDs
    SELECT id INTO acc_persediaan FROM chart_of_accounts WHERE code = '1203'; -- Persediaan Barang Jadi (Default)
    SELECT id INTO acc_hutang FROM chart_of_accounts WHERE code = '2001'; -- Hutang Usaha

    IF acc_persediaan IS NULL OR acc_hutang IS NULL THEN
        RAISE EXCEPTION 'Required accounts (1203, 2001) not found';
    END IF;

    -- 2. Insert Mappings
    
    -- CONFIRM PURCHASE (Goods Receipt)
    -- Debit: Persediaan (Asset Increase)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
    VALUES ('confirm_purchase', NULL, 'debit', acc_persediaan, 10, true)
    ON CONFLICT DO NOTHING;

    -- Credit: Hutang (Liability Increase)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
    VALUES ('confirm_purchase', NULL, 'credit', acc_hutang, 10, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'V2 Purchase Mappings Seeded Successfully.';
END $$;
