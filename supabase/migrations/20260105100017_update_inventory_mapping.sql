-- Update Default Inventory Account to 'Persediaan Barang Beli Jadi' (1204)
-- Because current business model is Trading (Buy Finished Goods -> Sell), not Manufacturing.
-- Currently mapped to 'Persediaan Barang Jadi' (1203) which implies manufacturing output.

DO $$
DECLARE
    v_trading_inventory_id UUID;
    v_manufacturing_inventory_id UUID;
BEGIN
    -- 1. Find Account IDs
    SELECT id INTO v_trading_inventory_id FROM public.chart_of_accounts WHERE code = '1204';
    SELECT id INTO v_manufacturing_inventory_id FROM public.chart_of_accounts WHERE code = '1203';

    -- Check if target account exists
    IF v_trading_inventory_id IS NULL THEN
        RAISE NOTICE 'Account 1204 not found. Creating it or skipping...';
        -- Optional: Create if missing, but usually existing CoA is assumed.
        -- Assuming user said it exists.
        RETURN;
    END IF;

    -- 2. Update V1 Settings (Global Default)
    UPDATE public.app_settings
    SET setting_value = v_trading_inventory_id::text
    WHERE setting_key = 'account_persediaan';

    -- 3. Update V2 Mappings (Granular Control)
    -- Event: confirm_purchase (Debit Persediaan)
    -- Side: debit
    UPDATE public.journal_account_mappings
    SET account_id = v_trading_inventory_id
    WHERE event_type = 'confirm_purchase' AND side = 'debit';
    
    -- Also check 'receive' event context if used?
    -- Currently auto-journal-purchase uses 'confirm_purchase' logic for V2 mapping lookup?
    -- Let's check the code: 
    -- const v2Persediaan = await getAccountFromV2('confirm_purchase', null, 'debit'); (Line 130 of index.ts)
    -- Yes, it uses 'confirm_purchase'.

    RAISE NOTICE 'Updated Inventory Account Mapping to 1204 (Persediaan Barang Beli Jadi)';
END $$;
