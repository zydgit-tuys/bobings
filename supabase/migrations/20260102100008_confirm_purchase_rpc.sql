-- ========================================================
-- CONFIRM PURCHASE RPC (Rule #2 & #3)
-- ========================================================

CREATE OR REPLACE FUNCTION public.confirm_purchase_order(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase RECORD;
    v_updated_purchase RECORD;
BEGIN
    -- 1. Lock and Get Purchase
    SELECT * INTO v_purchase
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;

    -- 2. Validate State (State Machine Rule)
    IF v_purchase.status != 'draft' THEN
        RAISE EXCEPTION 'Only draft orders can be confirmed. Current status: %', v_purchase.status;
    END IF;

    -- 3. Update Status
    -- Triggers will handle:
    --   - audit logs (confirmed_by, confirmed_at)
    --   - other side effects
    UPDATE public.purchases
    SET status = 'ordered',
        updated_at = NOW()
    WHERE id = p_purchase_id
    RETURNING * INTO v_updated_purchase;

    -- 4. Return Result
    RETURN jsonb_build_object(
        'success', true,
        'purchase', row_to_json(v_updated_purchase)
    );
END;
$$;
