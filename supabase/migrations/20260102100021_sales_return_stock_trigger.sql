-- Trigger function to handle stock updates when Sales Return is completed
CREATE OR REPLACE FUNCTION public.process_sales_return_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line RECORD;
    variant_data RECORD;
BEGIN
    -- Only process when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        
        -- Loop through return lines
        FOR line IN 
            SELECT srl.*, oi.variant_id
            FROM public.sales_return_lines srl
            JOIN public.order_items oi ON srl.sales_order_line_id = oi.id
            WHERE srl.return_id = NEW.id
        LOOP
            -- Insert into stock movements
            -- Type: 'RETURN' -> This maps to Stock In (+) in our new inventory logic
            INSERT INTO public.stock_movements (
                variant_id,
                movement_type,
                qty,
                reference_type,
                reference_id,
                notes,
                created_by
            ) VALUES (
                line.variant_id,
                'RETURN', -- Important: This MUST trigger the update_variant_stock with 'RETURN' logic
                line.qty,
                'sales_return',
                NEW.id,
                'Sales Return: ' || NEW.return_no,
                auth.uid()
            );
            
            -- Note: We rely on the 'update_variant_stock' trigger on stock_movements 
            -- or the 'trigger_recalc_stock_on_update' on product_variants to handle the actual math.
            -- Based on 'refactor_inventory_schema.sql', 'RETURN' type adds to stock_in (+).
            
        END LOOP;
        
        -- Trigger Auto-Journaling via Edge Function
        -- (This is usually done via webhook or client-side call, but we can also use pg_net if available)
        -- For this project, we seem to rely on Client calling the Edge Function or a separate Trigger.
        -- We will leave the journaling trigger for the next step (or handle it in the UI/Service layer like Purchase Returns).

    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sales_return_stock ON public.sales_returns;

CREATE TRIGGER trigger_sales_return_stock
    AFTER UPDATE OF status ON public.sales_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.process_sales_return_stock();
