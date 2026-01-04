-- ========================================================
-- CLEANUP: Remove Frontend Logic for Timestamps & Dates
-- ========================================================

-- 1. Set default value for order_date
ALTER TABLE public.purchases 
  ALTER COLUMN order_date SET DEFAULT CURRENT_DATE;

-- 2. Set default value for updated_at
ALTER TABLE public.purchases 
  ALTER COLUMN updated_at SET DEFAULT now();

-- 3. Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Trigger to auto-update timestamp on any purchase update
DROP TRIGGER IF EXISTS trigger_update_timestamp ON public.purchases;
CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 5. Add updated_at column to purchase_order_lines for audit trail consistency
ALTER TABLE public.purchase_order_lines 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 6. Trigger to auto-update timestamp on purchase_order_lines
DROP TRIGGER IF EXISTS trigger_update_pol_timestamp ON public.purchase_order_lines;
CREATE TRIGGER trigger_update_pol_timestamp
BEFORE UPDATE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
