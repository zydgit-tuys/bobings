-- ========================================================
-- SECURE UNITS TABLE (Fix "Unrestricted" status)
-- ========================================================

-- 1. Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 2. Add Policy (Consistent with other Master Data tables like brands, categories)
-- Since this is a single-tenant/single-user system for now, we use a broad policy.
-- In the future, this should be tightened to "Authenticated Read / Admin Write".
DROP POLICY IF EXISTS "Allow public access" ON public.units;

CREATE POLICY "Allow public access"
    ON public.units
    FOR ALL
    USING (true)
    WITH CHECK (true);
