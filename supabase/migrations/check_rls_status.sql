-- Check RLS status and Policies for customers
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'customers';

SELECT * FROM pg_policies WHERE tablename = 'customers';
