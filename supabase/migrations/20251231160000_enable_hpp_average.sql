-- =============================================
-- FUNCTION: Calculate Moving Average HPP
-- =============================================
-- This function runs AFTER stock is increased by purchase receiving.
-- It recalculates HPP based on weighted average.

CREATE OR REPLACE FUNCTION public.calculate_moving_average_hpp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_cost DECIMAL(15,2);
    v_current_hpp DECIMAL(15,2);
    v_current_stock INTEGER;
    v_old_stock INTEGER;
    v_new_hpp DECIMAL(15,2);
BEGIN
    -- Only calculate for Purchase Receiving (IN) linked to purchase_order_line
    IF NEW.movement_type = 'IN' AND NEW.reference_type = 'purchase_order_line' THEN
        
        -- 1. Get Purchase Cost from the line item
        SELECT unit_cost INTO v_new_cost
        FROM public.purchase_order_lines
        WHERE id = NEW.reference_id::UUID; -- Cast to UUID as ref_id is text usually? Stock movement definition check needed.
        -- Wait, stock_movements reference_id is UUID usually? Let's assume standard schema.
        
        -- 2. Get Current Stock and HPP (Current Stock already includes NEW.qty due to trigger order)
        SELECT hpp, stock_qty INTO v_current_hpp, v_current_stock
        FROM public.product_variants
        WHERE id = NEW.variant_id;
        
        -- If missing data, skip
        IF v_new_cost IS NULL OR v_current_hpp IS NULL OR v_current_stock IS NULL THEN
            RETURN NEW;
        END IF;

        -- 3. Calculate Old Stock
        v_old_stock := v_current_stock - NEW.qty;

        -- Handle edge case: If Old Stock <= 0 (e.g. was negative or zero), strictly use New Cost
        -- Or if Current Stock <= 0 (shouldn't happen on IN), skip
        IF v_old_stock <= 0 THEN
             v_new_hpp := v_new_cost;
        ELSE
             -- Weighted Average Formula
             -- New HPP = ((Old Stock * Old HPP) + (New Qty * New Cost)) / Total Stock
             v_new_hpp := ((v_old_stock * v_current_hpp) + (NEW.qty * v_new_cost)) / v_current_stock;
        END IF;

        -- 4. Update HPP
        UPDATE public.product_variants
        SET hpp = v_new_hpp,
            updated_at = now()
        WHERE id = NEW.variant_id;
        
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger must run AFTER the stock update trigger.
-- Existing stock trigger is named 'trigger_update_stock'.
-- Trigger execution order is alphabetical.
-- We name this 'trigger_z_calculate_hpp' to ensure it runs last.

DROP TRIGGER IF EXISTS trigger_z_calculate_hpp ON public.stock_movements;

CREATE TRIGGER trigger_z_calculate_hpp
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.calculate_moving_average_hpp();
