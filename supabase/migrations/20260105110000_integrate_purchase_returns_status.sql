-- ============================================
-- INTEGRATE RETURNS INTO PURCHASE STATUS
-- ============================================

-- 1. Helper function to calculate total returned amount
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
    AND pr.status = 'completed';
    
    RETURN v_total;
END;
$$;

-- 2. Unified status trigger function
CREATE OR REPLACE FUNCTION public.update_purchase_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_purchase RECORD;
    v_total_received DECIMAL(15,2);
    v_total_paid DECIMAL(15,2);
    v_total_returned DECIMAL(15,2);
    v_effective_total DECIMAL(15,2);
    v_new_status public.purchase_status;
    v_purchase_id UUID;
BEGIN
    -- 1. Identify Purchase ID based on trigger source
    IF TG_TABLE_NAME = 'purchase_order_lines' THEN
        IF TG_OP = 'DELETE' THEN v_purchase_id := OLD.purchase_id; ELSE v_purchase_id := NEW.purchase_id; END IF;
    ELSIF TG_TABLE_NAME IN ('purchase_receipts', 'purchase_payments', 'purchase_returns') THEN
        IF TG_OP = 'DELETE' THEN v_purchase_id := OLD.purchase_id; ELSE v_purchase_id := NEW.purchase_id; END IF;
    END IF;

    IF v_purchase_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 2. Get purchase details
    SELECT * INTO v_purchase FROM public.purchases WHERE id = v_purchase_id;
    
    IF NOT FOUND OR v_purchase.status IN ('draft', 'cancelled') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- 3. Calculate totals using helper functions
    v_total_received := public.get_total_received_amount(v_purchase.id);
    v_total_paid := public.get_total_paid_amount(v_purchase.id);
    v_total_returned := public.get_total_return_amount(v_purchase.id);
    
    -- 4. Effective total is what we actually need to pay/receive after returns
    v_effective_total := v_purchase.total_amount - v_total_returned;
    
    -- 5. Determine new status
    -- Priority: Completed (Paid & Received) > Received (Physical match) > Partial > Ordered
    IF v_total_received >= v_effective_total AND v_total_paid >= v_effective_total THEN
        v_new_status := 'completed';
    ELSIF v_total_received >= v_effective_total THEN
        v_new_status := 'received';
    ELSIF v_total_received > 0 OR v_total_paid > 0 OR v_total_returned > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'ordered';
    END IF;
    
    -- 6. Update purchase if changed
    IF v_new_status IS DISTINCT FROM v_purchase.status THEN
        UPDATE public.purchases
        SET status = v_new_status,
            updated_at = now(),
            received_date = CASE WHEN v_new_status = 'received' AND received_date IS NULL THEN CURRENT_DATE ELSE received_date END
        WHERE id = v_purchase.id;
        
        RAISE NOTICE 'Purchase % status changed: % -> % (Effective total: %)', 
            v_purchase.purchase_no, v_purchase.status, v_new_status, v_effective_total;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Update all triggers to use the unified function
-- Receipts
DROP TRIGGER IF EXISTS trg_update_purchase_status_on_receipt ON public.purchase_receipts;
CREATE TRIGGER trg_update_purchase_status_on_receipt
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_purchase_status();

-- Payments
DROP TRIGGER IF EXISTS trg_update_purchase_status_on_payment ON public.purchase_payments;
CREATE TRIGGER trg_update_purchase_status_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_payments
FOR EACH ROW EXECUTE FUNCTION public.update_purchase_status();

-- Returns
DROP TRIGGER IF EXISTS trg_update_purchase_status_on_return ON public.purchase_returns;
CREATE TRIGGER trg_update_purchase_status_on_return
AFTER INSERT OR UPDATE OF status OR DELETE ON public.purchase_returns
FOR EACH ROW EXECUTE FUNCTION public.update_purchase_status();

-- Order Lines (Replaces trigger_update_purchase_status from 20260102100019)
DROP TRIGGER IF EXISTS trigger_update_purchase_status ON public.purchase_order_lines;
CREATE TRIGGER trg_update_purchase_status_on_lines
AFTER INSERT OR UPDATE OF qty_received OR DELETE ON public.purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION public.update_purchase_status();

-- 4. Deactivate conflicting helper if it exists
CREATE OR REPLACE FUNCTION public.check_and_update_purchase_status(p_purchase_id UUID)
RETURNS VOID AS $$
BEGIN
    -- This function is now deprecated. update_purchase_status trigger handles everything.
    -- Calling the unified logic once just in case
    PERFORM public.update_purchase_status_by_id(p_purchase_id);
END;
$$ LANGUAGE plpgsql;

-- Internal helper for manual calls
CREATE OR REPLACE FUNCTION public.update_purchase_status_by_id(p_purchase_id UUID)
RETURNS VOID AS $$
DECLARE
    v_purchase RECORD;
    v_total_received DECIMAL(15,2);
    v_total_paid DECIMAL(15,2);
    v_total_returned DECIMAL(15,2);
    v_effective_total DECIMAL(15,2);
    v_new_status public.purchase_status;
BEGIN
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    IF NOT FOUND OR v_purchase.status IN ('draft', 'cancelled') THEN RETURN; END IF;

    v_total_received := public.get_total_received_amount(v_purchase.id);
    v_total_paid := public.get_total_paid_amount(v_purchase.id);
    v_total_returned := public.get_total_return_amount(v_purchase.id);
    v_effective_total := v_purchase.total_amount - v_total_returned;

    IF v_total_received >= v_effective_total AND v_total_paid >= v_effective_total THEN
        v_new_status := 'completed';
    ELSIF v_total_received >= v_effective_total THEN
        v_new_status := 'received';
    ELSIF v_total_received > 0 OR v_total_paid > 0 OR v_total_returned > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'ordered';
    END IF;

    IF v_new_status IS DISTINCT FROM v_purchase.status THEN
        UPDATE public.purchases SET status = v_new_status, updated_at = now() WHERE id = p_purchase_id;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 4. COMPUTED COLUMNS FOR API
-- ============================================

CREATE OR REPLACE FUNCTION public.total_received(p_row public.purchases) 
RETURNS DECIMAL(15,2) AS $$
    SELECT public.get_total_received_amount(p_row.id);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.total_paid(p_row public.purchases) 
RETURNS DECIMAL(15,2) AS $$
    SELECT public.get_total_paid_amount(p_row.id);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.total_returned(p_row public.purchases) 
RETURNS DECIMAL(15,2) AS $$
    SELECT public.get_total_return_amount(p_row.id);
$$ LANGUAGE sql STABLE;

