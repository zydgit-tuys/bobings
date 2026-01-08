-- Update the return amount calculation to be more robust
-- It should count returns that have a journal entry OR are marked completed
CREATE OR REPLACE FUNCTION public.get_total_return_amount(p_purchase_id UUID)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(prl.qty * pol.unit_cost), 0)
    INTO v_total
    FROM public.purchase_return_lines prl
    JOIN public.purchase_returns pr ON pr.id = prl.return_id
    JOIN public.purchase_order_lines pol ON pol.id = prl.purchase_line_id
    WHERE pr.purchase_id = p_purchase_id
    AND (pr.status = 'completed' OR pr.journal_entry_id IS NOT NULL);
    
    RETURN v_total;
END;
$$;

-- Force refresh of purchase statuses to update the cached calculation
CREATE OR REPLACE FUNCTION public.refresh_all_purchase_statuses()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.purchases WHERE status IN ('partial', 'received', 'completed') LOOP
        PERFORM public.update_purchase_status_by_id(r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT public.refresh_all_purchase_statuses();
