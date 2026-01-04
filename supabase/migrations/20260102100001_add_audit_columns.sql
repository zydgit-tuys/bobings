-- ========================================================
-- ADD AUDIT COLUMNS (Rule #4 & #8)
-- ========================================================

-- 1. Alter Purchases Table
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 2. Alter Sales Orders Table
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- ========================================================
-- AUTOMATIC AUDIT TRIGGER
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_confirmation_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Logic for Purchase Orders
    IF TG_TABLE_NAME = 'purchases' THEN
        -- If status changes to 'ordered' (Confirmation event)
        IF NEW.status = 'ordered' AND (OLD.status IS DISTINCT FROM 'ordered') THEN
            NEW.confirmed_at := NOW();
            -- Try to get current user ID if available (needs RLS/Auth context)
            -- We use COALESCE to keep existing value if manually set, or default to auth.uid()
            NEW.confirmed_by := COALESCE(NEW.confirmed_by, auth.uid());
        END IF;
    END IF;

    -- Logic for Sales Orders
    IF TG_TABLE_NAME = 'sales_orders' THEN
        -- If status changes to 'completed' (Confirmation event for now)
        IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
            NEW.confirmed_at := NOW();
            NEW.confirmed_by := COALESCE(NEW.confirmed_by, auth.uid());
        END IF;
    END IF;
    
    -- Logic for Creation (One-time) for both
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for Purchases
DROP TRIGGER IF EXISTS trigger_audit_purchases ON public.purchases;
CREATE TRIGGER trigger_audit_purchases
BEFORE INSERT OR UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.handle_confirmation_audit();

-- Trigger for Sales Orders
DROP TRIGGER IF EXISTS trigger_audit_sales_orders ON public.sales_orders;
CREATE TRIGGER trigger_audit_sales_orders
BEFORE INSERT OR UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_confirmation_audit();
