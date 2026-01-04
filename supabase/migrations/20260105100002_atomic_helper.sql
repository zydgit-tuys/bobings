-- Helper function to centralize status logic (refactoring trigger to use this)
CREATE OR REPLACE FUNCTION public.check_and_update_purchase_status(p_purchase_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_all_received BOOLEAN;
    v_any_received BOOLEAN;
    v_status public.purchase_status;
    v_current_status public.purchase_status;
BEGIN
    SELECT status INTO v_current_status FROM public.purchases WHERE id = p_purchase_id;

    -- Don't mess with cancelled or draft
    IF v_current_status IN ('draft', 'cancelled') THEN
        RETURN;
    END IF;

    -- Check status across all lines
    SELECT
        bool_and(qty_received >= qty_ordered),
        bool_or(qty_received > 0)
    INTO v_all_received, v_any_received
    FROM public.purchase_order_lines
    WHERE purchase_id = p_purchase_id;

    -- Determine status based solely on Physical Goods
    IF v_all_received THEN
        v_status := 'received';
    ELSIF v_any_received THEN
        v_status := 'partial';
    ELSE
        v_status := 'ordered';
    END IF;

    -- Note: 'completed' status is for Payment.
    -- If we are already 'completed', and we receive more goods (?), we stay completed?
    -- Or if we are 'received', we stay 'received' until paid.
    -- This function only handles GOODS status (Ordered -> Partial -> Received).
    -- It should NOT downgrade 'completed' back to 'received' if paid.

    IF v_current_status = 'completed' THEN
        RETURN; -- Stay completed
    END IF;

    UPDATE public.purchases
    SET
        status = v_status,
        received_date = CASE WHEN v_status = 'received' THEN CURRENT_DATE ELSE received_date END,
        updated_at = now()
    WHERE id = p_purchase_id;
END;
$$;
