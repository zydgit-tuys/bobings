-- BULLETPROOF FIX for Purchase Return Permissions
-- 1. Run this script in Supabase SQL Editor
-- 2. AFTER running, please REFRESH your browser or Logout/Login

-- A. Fix the Trigger Function (SECURITY DEFINER + search_path)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- B. Ensure 'authenticated' role has usage on schema public
GRANT USAGE ON SCHEMA public TO authenticated;

-- C. Reset Table Permissions
GRANT ALL ON TABLE purchase_returns TO authenticated;
GRANT ALL ON TABLE purchase_return_lines TO authenticated;
-- GRANT ALL ON SEQUENCE purchase_returns_id_seq TO authenticated; -- Removed: UUID PK, No Sequence
-- GRANT ALL ON SEQUENCE purchase_return_lines_id_seq TO authenticated; -- Removed: UUID PK, No Sequence

-- D. Reset RLS Policies (Force permit all for authenticated)
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_lines ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_returns;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON purchase_return_lines;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_returns;

-- Create permissive policies
CREATE POLICY "Enable all access for authenticated users" ON purchase_returns
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON purchase_return_lines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
