-- ========================================================
-- PREVENT HARD DELETE ON FINALIZED TRANSACTIONS (Rule #3)
-- ========================================================

CREATE OR REPLACE FUNCTION public.prevent_finalized_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for Purchases
    IF TG_TABLE_NAME = 'purchases' THEN
        IF OLD.status IN ('received', 'partial', 'completed') THEN
            RAISE EXCEPTION 'Cannot delete purchase with status %', OLD.status
                USING HINT = 'Use reverse/return transaction instead of deleting.';
        END IF;
    END IF;

    -- Check for Sales Orders
    IF TG_TABLE_NAME = 'sales_orders' THEN
        IF OLD.status IN ('completed', 'processing') THEN -- Adjust status based on actual flow
            RAISE EXCEPTION 'Cannot delete sales order with status %', OLD.status
                USING HINT = 'Use sales return transaction instead of deleting.';
        END IF;
    END IF;

    -- Check for Inventory Moves (Should never be deleted ideally, or strictly controlled)
    IF TG_TABLE_NAME = 'stock_movements' THEN
        RAISE EXCEPTION 'Hard deletion of stock movements is strictly prohibited. Create a counter-movement.'
            USING HINT = 'Data Integrity Violation';
    END IF;

    RETURN OLD;
END;
$$;

-- Trigger for Purchases
DROP TRIGGER IF EXISTS trigger_prevent_delete_purchases ON public.purchases;
CREATE TRIGGER trigger_prevent_delete_purchases
BEFORE DELETE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.prevent_finalized_delete();

-- Trigger for Sales Orders
DROP TRIGGER IF EXISTS trigger_prevent_delete_sales_orders ON public.sales_orders;
CREATE TRIGGER trigger_prevent_delete_sales_orders
BEFORE DELETE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_finalized_delete();

-- Trigger for Stock Movements
DROP TRIGGER IF EXISTS trigger_prevent_delete_stock_movements ON public.stock_movements;
CREATE TRIGGER trigger_prevent_delete_stock_movements
BEFORE DELETE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_finalized_delete();
