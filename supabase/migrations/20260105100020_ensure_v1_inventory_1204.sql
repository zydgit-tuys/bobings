-- Ensure V1 setting also points to 1204 (not just V2 mapping)
-- This is the fallback when V2 mapping is not found

DO $$
DECLARE
    v_inventory_1204_id UUID;
BEGIN
    -- Get account ID for 1204
    SELECT id INTO v_inventory_1204_id FROM public.chart_of_accounts WHERE code = '1204';

    IF v_inventory_1204_id IS NULL THEN
        RAISE EXCEPTION 'Account 1204 not found';
    END IF;

    -- Update V1 setting to ensure it points to 1204
    UPDATE public.app_settings
    SET setting_value = v_inventory_1204_id::text,
        updated_at = now()
    WHERE setting_key = 'account_persediaan';

    RAISE NOTICE '✅ V1 setting account_persediaan updated to 1204';
END $$;
