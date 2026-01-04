-- Disable broken HPP Calculation Trigger
-- The column 'hpp' was removed from product_variants, so this trigger fails.
DROP TRIGGER IF EXISTS trigger_z_calculate_hpp ON public.stock_movements;
DROP FUNCTION IF EXISTS public.calculate_moving_average_hpp();
