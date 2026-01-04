-- ========================================================
-- REFACTOR PRODUCT VARIANTS (ERP-SAFE)
-- ========================================================

-- 1. Drop Derived/Unsafe Columns
-- First, drop triggers that depend on these columns
DROP TRIGGER IF EXISTS trigger_recalc_stock_on_update ON public.product_variants;
DROP TRIGGER IF EXISTS trigger_recalc_stock_on_insert ON public.product_variants;
DROP FUNCTION IF EXISTS public.recalculate_variant_stock_level();

ALTER TABLE public.product_variants
DROP COLUMN IF EXISTS stock_in,
DROP COLUMN IF EXISTS stock_out,
DROP COLUMN IF EXISTS available_qty,
DROP COLUMN IF EXISTS virtual_stock_qty,
DROP COLUMN IF EXISTS hpp,
DROP COLUMN IF EXISTS cost_price;

-- 2. Ensure vital columns exist (for safety, though they should be there)
-- stock_qty is kept as a CACHED field (updated via trigger)
-- reserved_qty is kept for marketplace logic
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'stock_qty') THEN
        RAISE EXCEPTION 'Critical column stock_qty missing from product_variants';
    END IF;
END $$;

-- 3. Update comments/metadata
COMMENT ON COLUMN public.product_variants.stock_qty IS 'CACHED: Current physical stock. Updated by stock_movements trigger.';
COMMENT ON COLUMN public.product_variants.reserved_qty IS 'CACHED: Stock reserved for active orders. Not yet deducted from physical stock.';
