-- ============================================
-- FIX PURCHASE STATUS TRIGGER TYPE MISMATCH
-- ============================================

-- Function to handle status updates more robustly
CREATE OR REPLACE FUNCTION public.update_purchase_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_purchase RECORD;
    v_total_received DECIMAL(15,2);
    v_total_paid DECIMAL(15,2);
    v_new_status public.purchase_status;
BEGIN
    -- Get purchase details using NEW.purchase_id (compatible with receipts and payments tables)
    SELECT * INTO v_purchase FROM public.purchases WHERE id = NEW.purchase_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Calculate totals from tracking tables
    v_total_received := public.get_total_received_amount(v_purchase.id);
    v_total_paid := public.get_total_paid_amount(v_purchase.id);
    
    -- Determine new status based on amounts
    -- We use explicit casting to public.purchase_status for clarity
    IF v_total_received >= v_purchase.total_amount AND v_total_paid >= v_purchase.total_amount AND v_purchase.total_amount > 0 THEN
        v_new_status := 'completed'::public.purchase_status;
    ELSIF v_total_received >= v_purchase.total_amount AND v_purchase.total_amount > 0 THEN
        v_new_status := 'received'::public.purchase_status;
    ELSIF v_total_received > 0 OR v_total_paid > 0 THEN
        v_new_status := 'partial'::public.purchase_status;
    ELSE
        -- If no receipts/payments, stay in current status (usually 'ordered' or 'draft')
        v_new_status := v_purchase.status;
    END IF;
    
    -- Update purchase status if changed
    -- Casting both to text for comparison to avoid 'operator does not exist' errors
    IF v_new_status::text IS DISTINCT FROM v_purchase.status::text THEN
        UPDATE public.purchases
        SET status = v_new_status,
            updated_at = now()
        WHERE id = v_purchase.id;
        
        RAISE NOTICE 'Purchase % status updated: % -> %', v_purchase.purchase_no, v_purchase.status, v_new_status;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Note: Triggers already exist from migration 20260105100021
