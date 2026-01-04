-- Function to receive multiple purchase lines atomically
CREATE OR REPLACE FUNCTION public.receive_purchase_lines_atomic(
    p_purchase_id UUID,
    p_items JSONB -- Array of { line_id: "...", qty: 123 }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_line_id UUID;
    v_qty NUMERIC;
    v_updated_purchase public.purchases;
BEGIN
    -- Loop through items and update lines
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_line_id := (item->>'line_id')::UUID;
        v_qty := (item->>'qty')::NUMERIC;

        UPDATE public.purchase_order_lines
        SET qty_received = v_qty
        WHERE id = v_line_id AND purchase_id = p_purchase_id;
    END LOOP;

    -- The trigger "trigger_update_purchase_status" on purchase_order_lines
    -- will fire for each update, but since we are in one transaction,
    -- the final state will be consistent.
    -- However, to be extra safe and avoid race conditions from multiple triggers,
    -- we can force a manual status check here at the end.

    -- Force status update (Logic duplicated from Trigger for safety/assurance)
    PERFORM public.check_and_update_purchase_status(p_purchase_id);

    -- Return the updated purchase
    SELECT * INTO v_updated_purchase FROM public.purchases WHERE id = p_purchase_id;

    RETURN to_jsonb(v_updated_purchase);
END;
$$;
