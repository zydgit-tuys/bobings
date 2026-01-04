-- Fix RLS Policy for customers table
-- Run this after 20260105_simple_pricing_refactor.sql

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exists
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON customers;

-- Create comprehensive policy for authenticated users (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Enable all access for authenticated users" ON customers
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify
COMMENT ON TABLE customers IS 'Customer master data with simple type classification (umum/khusus) - RLS enabled for authenticated users';
