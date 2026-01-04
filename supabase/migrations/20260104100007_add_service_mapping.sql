-- Add Pendapatan Jasa account if not exists
INSERT INTO chart_of_accounts (code, name, account_type)
VALUES ('4200', 'Pendapatan Jasa', 'revenue')
ON CONFLICT (code) DO NOTHING;

-- Add service product mapping to journal_account_mappings
DO $$
DECLARE
    acc_piutang_umum UUID;
    acc_pendapatan_jasa UUID;
BEGIN
    -- Lookup account IDs
    SELECT id INTO acc_piutang_umum FROM chart_of_accounts WHERE code = '1101';
    SELECT id INTO acc_pendapatan_jasa FROM chart_of_accounts WHERE code = '4200';
    
    -- Verify accounts exist
    IF acc_piutang_umum IS NULL THEN
        RAISE EXCEPTION 'Account 1101 (Piutang Umum) not found';
    END IF;
    
    IF acc_pendapatan_jasa IS NULL THEN
        RAISE EXCEPTION 'Account 4200 (Pendapatan Jasa) not found';
    END IF;
    
    -- Service Revenue Mapping (for manual/POS sales)
    -- Debit: Piutang Umum
    INSERT INTO journal_account_mappings (event_type, event_context, product_type, side, account_id, priority)
    VALUES ('confirm_sales_order', 'manual', 'service', 'debit', acc_piutang_umum, 15);
    
    -- Credit: Pendapatan Jasa
    INSERT INTO journal_account_mappings (event_type, event_context, product_type, side, account_id, priority)
    VALUES ('confirm_sales_order', 'manual', 'service', 'credit', acc_pendapatan_jasa, 15);
    
    RAISE NOTICE 'Service product mapping added successfully.';
END $$;

-- Note: Service products will NOT have COGS entries
-- This is handled in the auto-journal-sales Edge Function
