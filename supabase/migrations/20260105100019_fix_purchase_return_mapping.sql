-- Fix Purchase Return to use same inventory account as Purchase (1204)
-- Issue: Purchase uses 1204, but Purchase Return uses 1203 (inconsistent)

DO $$
DECLARE
    v_inventory_account_id UUID;
    v_hutang_account_id UUID;
    v_existing_debit UUID;
    v_existing_credit UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO v_inventory_account_id FROM public.chart_of_accounts WHERE code = '1204';
    SELECT id INTO v_hutang_account_id FROM public.chart_of_accounts WHERE code = '2001';

    IF v_inventory_account_id IS NULL OR v_hutang_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts not found (1204 or 2001)';
    END IF;

    -- Check if mappings already exist
    SELECT account_id INTO v_existing_debit 
    FROM public.journal_account_mappings 
    WHERE event_type = 'confirm_return_purchase' AND side = 'debit' 
    LIMIT 1;

    SELECT account_id INTO v_existing_credit 
    FROM public.journal_account_mappings 
    WHERE event_type = 'confirm_return_purchase' AND side = 'credit' 
    LIMIT 1;

    -- Delete old mappings if they exist
    DELETE FROM public.journal_account_mappings 
    WHERE event_type = 'confirm_return_purchase';

    -- Insert new mappings
    -- Return reverses the purchase entry:
    -- Purchase: Dr 1204, Cr 2001
    -- Return:   Dr 2001, Cr 1204

    INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
    VALUES 
        -- Debit: Hutang Usaha (liability decreases)
        ('confirm_return_purchase', NULL, 'debit', v_hutang_account_id, 10, true),
        -- Credit: Persediaan Barang Beli Jadi (asset decreases) - MUST BE 1204!
        ('confirm_return_purchase', NULL, 'credit', v_inventory_account_id, 10, true);

    RAISE NOTICE '✅ Purchase return now uses account 1204 (was: debit=%, credit=%)', 
        (SELECT code FROM chart_of_accounts WHERE id = v_existing_debit),
        (SELECT code FROM chart_of_accounts WHERE id = v_existing_credit);
END $$;
