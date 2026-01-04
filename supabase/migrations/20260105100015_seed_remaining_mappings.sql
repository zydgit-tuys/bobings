-- ========================================================
-- SEED REMAINING JOURNAL MAPPINGS (Stock & Payments)
-- ========================================================

DO $$
DECLARE
    -- Account IDs
    acc_persediaan          UUID; -- 1204 (Trading)
    acc_piutang_usaha       UUID; -- 1101
    
    acc_adj_loss            UUID; -- 6-101 (Kerugian Selisih Stok)
    acc_adj_gain            UUID; -- 7-101 (Keuntungan Selisih Stok)
    
    acc_kas                 UUID; -- 1001
BEGIN
    -- 1. Lookup Accounts
    SELECT id INTO acc_persediaan FROM chart_of_accounts WHERE code = '1204'; -- Persediaan Barang Beli Jadi
    IF acc_persediaan IS NULL THEN
        SELECT id INTO acc_persediaan FROM chart_of_accounts WHERE code = '1203'; -- Fallback: Barang Jadi
    END IF;

    SELECT id INTO acc_piutang_usaha FROM chart_of_accounts WHERE code = '1101';
    
    SELECT id INTO acc_adj_loss FROM chart_of_accounts WHERE code = '6-101';
    SELECT id INTO acc_adj_gain FROM chart_of_accounts WHERE code = '7-101';
    
    SELECT id INTO acc_kas FROM chart_of_accounts WHERE code = '1001';

    -- 2. Validate existence
    IF acc_persediaan IS NULL OR acc_piutang_usaha IS NULL OR acc_adj_loss IS NULL OR acc_adj_gain IS NULL THEN
        RAISE NOTICE 'Skipping seed: One or more required accounts not found.';
        RETURN;
    END IF;

    -- -------------------------------------------------------------
    -- 3. STOCK ADJUSTMENT
    -- -------------------------------------------------------------
    -- Logic: 
    -- If Qty > 0 (Surplus): Debit Persediaan, Credit Gain
    -- If Qty < 0 (Loss):    Debit Loss, Credit Persediaan
    
    -- Mapping: 'stock_adjustment'
    
    -- Side: DEBIT (When inventory increases) -> Persediaan
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('stock_adjustment', 'increase', 'debit', acc_persediaan, 10)
    ON CONFLICT DO NOTHING;

    -- Side: CREDIT (When inventory increases) -> Gain Account
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('stock_adjustment', 'increase', 'credit', acc_adj_gain, 10)
    ON CONFLICT DO NOTHING;

    -- Side: DEBIT (When inventory decreases) -> Loss Account
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('stock_adjustment', 'decrease', 'debit', acc_adj_loss, 10)
    ON CONFLICT DO NOTHING;

    -- Side: CREDIT (When inventory decreases) -> Persediaan
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('stock_adjustment', 'decrease', 'credit', acc_persediaan, 10)
    ON CONFLICT DO NOTHING;


    -- -------------------------------------------------------------
    -- 4. STOCK OPNAME (Same logic as Adjustment)
    -- -------------------------------------------------------------
    -- Mapping: 'stock_opname'
    
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES 
    ('stock_opname', 'increase', 'debit', acc_persediaan, 10),
    ('stock_opname', 'increase', 'credit', acc_adj_gain, 10),
    ('stock_opname', 'decrease', 'debit', acc_adj_loss, 10),
    ('stock_opname', 'decrease', 'credit', acc_persediaan, 10)
    ON CONFLICT DO NOTHING;


    -- -------------------------------------------------------------
    -- 5. CUSTOMER PAYMENT
    -- -------------------------------------------------------------
    -- Credit: PIUTANG USAHA (Always, for standard payment)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('customer_payment', NULL, 'credit', acc_piutang_usaha, 10)
    ON CONFLICT DO NOTHING;

    -- Debit: KAS (Context: cash)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('customer_payment', 'cash', 'debit', acc_kas, 10)
    ON CONFLICT DO NOTHING;

    -- Note: Bank transfers usually use specific bank accounts from `bank_accounts` table, 
    -- but we can set a default 'Bank' mapping if needed.
    
    RAISE NOTICE '✅ Remaining Journal Mappings Seeded (Stock & Payments)';
END $$;
