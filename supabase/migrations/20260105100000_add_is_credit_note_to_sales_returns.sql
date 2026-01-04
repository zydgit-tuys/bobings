-- 1. Add is_credit_note column to sales_returns
ALTER TABLE public.sales_returns
ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN DEFAULT FALSE;

-- 2. Update the trigger function to skip stock movements if is_credit_note is TRUE
CREATE OR REPLACE FUNCTION public.process_sales_return_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line RECORD;
BEGIN
    -- Only process when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        
        -- CHECK: If this is a Credit Note (Financial Only), we SKIP stock updates entirely.
        IF NEW.is_credit_note IS TRUE THEN
            RETURN NEW; 
        END IF;

        -- Loop through return lines
        FOR line IN 
            SELECT srl.*, oi.variant_id
            FROM public.sales_return_lines srl
            JOIN public.order_items oi ON srl.sales_order_line_id = oi.id
            WHERE srl.return_id = NEW.id
        LOOP
            -- Insert into stock movements
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
                'RETURN',
                line.qty,
                'sales_return',
                NEW.id,
                'Sales Return: ' || NEW.return_no,
                auth.uid()
            );
        END LOOP;

    END IF;
    
    RETURN NEW;
END;
$$;
