-- ALLOW ANONYMOUS ACCESS (For development without Users)
-- Run this in Supabase SQL Editor

-- 1. Grant Usage to 'anon' role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE purchase_returns TO anon;
GRANT ALL ON TABLE purchase_return_lines TO anon;
-- Grant sequence access if needed (usually handled by ALL ON TABLE for serial, but good to be safe)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 2. Update Policies to include 'anon' (or just use public)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_return_lines;

-- Create Public Policies (Authenticated + Anon)
CREATE POLICY "Enable all access for all users" ON purchase_returns
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for all users" ON purchase_return_lines
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Ensure Trigger Function is accessible
-- Already SECURIY DEFINER, but good to ensure execute permission
GRANT EXECUTE ON FUNCTION generate_return_no() TO anon;
GRANT EXECUTE ON FUNCTION generate_return_no() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_return_no() TO service_role;
