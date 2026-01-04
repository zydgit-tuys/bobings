-- Trigger to Auto-Recalculate stock_qty on product_variants
-- Ensures stock_qty always equals (initial_stock + stock_in - stock_out) whenever any component changes.

CREATE OR REPLACE FUNCTION public.recalculate_variant_stock_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Coalesce to 0 to handle potential nulls (though columns should be NOT NULL default 0)
    NEW.stock_qty := COALESCE(NEW.initial_stock, 0) + COALESCE(NEW.stock_in, 0) - COALESCE(NEW.stock_out, 0);
    
    -- Also update available_qty (it's generated stored, but good to be aware)
    -- Postgres automatically updates generated columns, so we don't need to touch available_qty here.
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalc_stock_on_update ON public.product_variants;

CREATE TRIGGER trigger_recalc_stock_on_update
BEFORE UPDATE OF initial_stock, stock_in, stock_out ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_variant_stock_level();

-- Also run it on insert just in case
DROP TRIGGER IF EXISTS trigger_recalc_stock_on_insert ON public.product_variants;

CREATE TRIGGER trigger_recalc_stock_on_insert
BEFORE INSERT ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_variant_stock_level();
