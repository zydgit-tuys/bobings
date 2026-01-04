-- TEMPORARY: Disable RLS on customers table for testing
-- This allows all operations without authentication checks
-- ONLY for development/testing - DO NOT USE IN PRODUCTION

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'customers';
