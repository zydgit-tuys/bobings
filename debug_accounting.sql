
-- 1. Check if the trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'journal_entries';

-- 2. Check all Accounting Periods and their dates/status
SELECT period_name, start_date, end_date, status 
FROM public.accounting_periods 
ORDER BY start_date DESC;

-- 3. Test the logic manually (Replace '2025-12-31' with the date you are trying to insert)
SELECT period_name AS "Would_Block_This_Period"
FROM public.accounting_periods
WHERE start_date <= '2025-12-31' 
  AND end_date >= '2025-12-31'
  AND status = 'closed';
