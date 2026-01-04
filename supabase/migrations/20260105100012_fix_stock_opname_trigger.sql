-- Trigger function to update stock movements on Stock Opname Confirmation
-- Fixes "Phantom Stock" issue where opname updates finance but not ledger.

CREATE OR REPLACE FUNCTION public.process_stock_opname_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line RECORD;
    v_diff DECIMAL;
BEGIN
    -- Only process when status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
        
        -- Loop through opname lines
        FOR line IN 
            SELECT * FROM public.stock_opname_lines 
            WHERE opname_id = NEW.id
        LOOP
            v_diff := line.difference_qty;
            
            -- If there is a difference, create an ADJUSTMENT movement
            IF v_diff <> 0 THEN
                INSERT INTO public.stock_movements (
                    variant_id,
                    movement_type,
                    qty, -- The absolute movement amount? Or the signed amount?
                         -- Our update_variant_stock trigger uses ABS(qty) and looks at movement_type.
                         -- For ADJUSTMENT:
                         -- If qty >= 0: Stock In
                         -- If qty < 0: Stock Out
                    reference_type,
                    reference_id,
                    notes,
                    created_by,
                    created_at
                ) VALUES (
                    line.variant_id,
                    'ADJUSTMENT',
                    v_diff, -- Pass signed difference. Trigger handles negative logic.
                    'stock_opname',
                    NEW.id,
                    'Stock Opname: ' || NEW.opname_no || ' (' || CASE WHEN v_diff > 0 THEN 'Surplus' ELSE 'Shortage' END || ')',
                    NEW.confirmed_by,
                    now()
                );
            END IF;
        END LOOP;

        UPDATE public.stock_opname 
        SET confirmed_at = now() 
        WHERE id = NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stock_opname_confirmation ON public.stock_opname;

CREATE TRIGGER trigger_stock_opname_confirmation
    AFTER UPDATE OF status ON public.stock_opname
    FOR EACH ROW
    EXECUTE FUNCTION public.process_stock_opname_confirmation();
