-- COMPREHENSIVE FIX for Purchase Return Permissions
-- Please run this entire script in Supabase SQL Editor

-- 1. Fix the Trigger Function to bypass RLS (SECURITY DEFINER)
-- This ensures the sequence generation works regardless of user permissions on other rows
CREATE OR REPLACE FUNCTION generate_return_no()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INT;
BEGIN
  -- Format: PR-YYYYMM-XXXX
  prefix := 'PR-' || to_char(NEW.return_date, 'YYYYMM') || '-';
  
  -- Find max sequence for this month
  SELECT COALESCE(MAX(SUBSTRING(return_no FROM LENGTH(prefix) + 1)::INT), 0) + 1
  INTO seq
  FROM purchase_returns
  WHERE return_no LIKE prefix || '%';

  -- Set the new return number
  NEW.return_no := prefix || LPAD(seq::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- <== Added SECURITY DEFINER

-- 2. Reset RLS Policies to be fully permissive for authenticated users
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_lines ENABLE ROW LEVEL SECURITY;

-- Drop all variable variations of policies to ensure a clean slate
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_return_lines;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON purchase_returns;

-- Helper macro to not fail if policy doesn't exist (Manual approach above is safer)

-- Create the ONE MASTER POLICY for Returns
CREATE POLICY "Enable all access for authenticated users" ON purchase_returns
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create the ONE MASTER POLICY for Return Lines
CREATE POLICY "Enable all access for authenticated users" ON purchase_return_lines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Explicit Grants
GRANT ALL ON purchase_returns TO authenticated;
GRANT ALL ON purchase_return_lines TO authenticated;
GRANT ALL ON purchase_returns TO service_role;
GRANT ALL ON purchase_return_lines TO service_role;
