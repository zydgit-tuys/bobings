-- Trigger function to handle stock deduction on Sales Order Completion
-- Moves Logic from Client-Side API to Database Trigger for safety.
-- Update: Handles both INSERT (Import/Direct Creation) and UPDATE (Status Change)

CREATE OR REPLACE FUNCTION public.process_sales_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
BEGIN
    -- Handle COMPLETION (Deduct Stock)
    -- Trigger on:
    -- 1. INSERT with status='completed'
    -- 2. UPDATE where status becomes 'completed'
    
    IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed') THEN
        
        FOR item IN 
            SELECT * FROM public.order_items WHERE order_id = NEW.id
        LOOP
            INSERT INTO public.stock_movements (
                variant_id,
                movement_type,
                qty,
                reference_type,
                reference_id,
                notes,
                created_at
            ) VALUES (
                item.variant_id,
                'SALE',
                item.qty, -- Trigger subtracts for SALE type
                'sales_order',
                NEW.id,
                'Sale: ' || NEW.desty_order_no,
                now()
            );
        END LOOP;

    -- Handle RESTORATION (Add Stock Back)
    -- Trigger on: UPDATE where status WAS 'completed' and NOW IS NOT 'completed'
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed') THEN
        
        FOR item IN 
            SELECT * FROM public.order_items WHERE order_id = NEW.id
        LOOP
            INSERT INTO public.stock_movements (
                variant_id,
                movement_type,
                qty,
                reference_type,
                reference_id,
                notes,
                created_at
            ) VALUES (
                item.variant_id,
                'RETURN', -- Adds stock back
                item.qty,
                'sales_order',
                NEW.id,
                'Restock (Order Edit): ' || NEW.desty_order_no,
                now()
            );
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sales_order_stock ON public.sales_orders;

CREATE TRIGGER trigger_sales_order_stock
    AFTER INSERT OR UPDATE OF status ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_sales_order_stock();
