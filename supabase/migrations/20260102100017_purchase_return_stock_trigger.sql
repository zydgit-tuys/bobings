-- Trigger to handle Stock Deduction on Purchase Return Completion
-- This ensures that when a Return is 'completed' (by Auto Journal), the physical stock is deducted.

CREATE OR REPLACE FUNCTION public.process_purchase_return_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process if status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Insert into stock_movements (OUT)
        -- We join with purchase_order_lines to get the variant_id
        INSERT INTO public.stock_movements (
            variant_id,
            movement_type,
            qty,
            reference_type,
            reference_id,
            notes,
            created_at
        )
        SELECT 
            pol.variant_id,
            'OUT'::public.movement_type, -- Use OUT because items are leaving our inventory
            prl.qty,
            'purchase_return',
            NEW.id,
            'Retur Pembelian: ' || NEW.return_no,
            now()
        FROM public.purchase_return_lines prl
        JOIN public.purchase_order_lines pol ON prl.purchase_line_id = pol.id
        WHERE prl.return_id = NEW.id
        AND pol.variant_id IS NOT NULL; -- Safety check

    END IF;
    
    RETURN NEW;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS trigger_purchase_return_stock ON public.purchase_returns;
CREATE TRIGGER trigger_purchase_return_stock
AFTER UPDATE ON public.purchase_returns
FOR EACH ROW
EXECUTE FUNCTION public.process_purchase_return_stock();
