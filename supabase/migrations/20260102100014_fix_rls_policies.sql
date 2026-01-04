-- Fix RLS Policies for Purchase Returns
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_lines ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_return_lines;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_return_lines;

-- 3. Re-create permissive policies for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON purchase_returns
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON purchase_return_lines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Grant explicit permissions (Just in case)
GRANT ALL ON purchase_returns TO authenticated;
GRANT ALL ON purchase_return_lines TO authenticated;
GRANT ALL ON purchase_returns TO service_role;
GRANT ALL ON purchase_return_lines TO service_role;
