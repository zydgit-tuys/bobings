-- ========================================================
-- REFACTOR: PO LOGIC (Moving business rules to Database)
-- ========================================================

-- 1. Function to auto-calculate subtotal on purchase order lines
CREATE OR REPLACE FUNCTION public.calculate_pol_subtotal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.subtotal := NEW.qty_ordered * NEW.unit_cost;
    RETURN NEW;
END;
$$;

-- 2. Trigger for subtotal calculation
DROP TRIGGER IF EXISTS trigger_calculate_pol_subtotal ON public.purchase_order_lines;
CREATE TRIGGER trigger_calculate_pol_subtotal
BEFORE INSERT OR UPDATE OF qty_ordered, unit_cost ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.calculate_pol_subtotal();

-- 3. Function to automatically update Purchase status based on receiving
CREATE OR REPLACE FUNCTION public.update_purchase_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID;
    v_all_received BOOLEAN;
    v_any_received BOOLEAN;
    v_status public.purchase_status;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_purchase_id := OLD.purchase_id;
    ELSE
        v_purchase_id := NEW.purchase_id;
    END IF;

    -- Check status across all lines
    SELECT 
        bool_and(qty_received >= qty_ordered),
        bool_or(qty_received > 0)
    INTO v_all_received, v_any_received
    FROM public.purchase_order_lines
    WHERE purchase_id = v_purchase_id;

    -- Determine status
    IF v_all_received THEN
        v_status := 'received';
    ELSIF v_any_received THEN
        v_status := 'partial';
    ELSE
        -- If no lines, or no reception, check current status
        -- If it was received/partial, revert to ordered if lines still exist
        v_status := 'ordered';
    END IF;

    -- Update parent purchase
    -- Only update if status is not 'draft' (don't override draft)
    -- AND don't update if it's 'cancelled'
    UPDATE public.purchases
    SET status = CASE 
        WHEN status IN ('draft', 'cancelled') THEN status
        ELSE v_status
    END,
    received_date = CASE 
        WHEN v_all_received THEN CURRENT_DATE 
        ELSE received_date 
    END,
    updated_at = now()
    WHERE id = v_purchase_id;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

-- 4. Trigger for status update
DROP TRIGGER IF EXISTS trigger_update_purchase_status ON public.purchase_order_lines;
CREATE TRIGGER trigger_update_purchase_status
AFTER INSERT OR UPDATE OF qty_received OR DELETE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_purchase_status();

-- 5. Function to generate atomic Purchase Number
-- Format: PO-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_purchase_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_next_val INTEGER;
BEGIN
    IF NEW.purchase_no IS NULL OR NEW.purchase_no = '' THEN
        v_prefix := 'PO-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-';
        
        -- Get last sequence for today with lock to prevent race conditions
        SELECT COALESCE(
            MAX(CAST(substring(purchase_no from 13) AS INTEGER)), 
            0
        ) + 1
        INTO v_next_val
        FROM public.purchases
        WHERE purchase_no LIKE v_prefix || '%';

        NEW.purchase_no := v_prefix || lpad(v_next_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Trigger for PO numbering
DROP TRIGGER IF EXISTS trigger_generate_purchase_no ON public.purchases;
CREATE TRIGGER trigger_generate_purchase_no
BEFORE INSERT ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.generate_purchase_no();
