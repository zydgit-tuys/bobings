-- ========================================================
-- FIX INVENTORY TRIGGER (Incremental Logic)
-- ========================================================
-- Needed because we are dropping stock_in/stock_out columns.
-- New logic updates stock_qty incrementally.

CREATE OR REPLACE FUNCTION public.update_variant_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_qty INTEGER;
BEGIN
    -- Determine the absolute quantity moved
    v_qty := ABS(NEW.qty);

    -- Update stock_qty incrementally based on movement type
    CASE NEW.movement_type
        WHEN 'IN' THEN
            UPDATE public.product_variants
            SET stock_qty = stock_qty + v_qty,
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'RETURN' THEN -- Customer Return (Stock IN)
             UPDATE public.product_variants
             SET stock_qty = stock_qty + v_qty,
                 updated_at = now()
             WHERE id = NEW.variant_id;
             
        WHEN 'OUT' THEN -- Usage / Purchase Return
            UPDATE public.product_variants
            SET stock_qty = stock_qty - v_qty,
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'SALE' THEN -- Sales (Stock OUT)
            UPDATE public.product_variants
            SET stock_qty = stock_qty - v_qty,
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'ADJUSTMENT' THEN
            IF NEW.qty >= 0 THEN
                -- Positive Adjustment = Stock In
                UPDATE public.product_variants
                SET stock_qty = stock_qty + v_qty,
                    updated_at = now()
                WHERE id = NEW.variant_id;
            ELSE
                -- Negative Adjustment = Stock Out
                UPDATE public.product_variants
                SET stock_qty = stock_qty - v_qty,
                    updated_at = now()
                WHERE id = NEW.variant_id;
            END IF;
    END CASE;

    RETURN NEW;
END;
$$;
