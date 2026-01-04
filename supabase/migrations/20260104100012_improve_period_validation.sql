-- ========================================================
-- IMPROVED ACCOUNTING PERIOD VALIDATION
-- ========================================================

-- 1. Enhanced function to check accounting period is OPEN
CREATE OR REPLACE FUNCTION public.check_accounting_period_open()
RETURNS TRIGGER AS $$
DECLARE
  v_period_status text;
  v_period_name text;
BEGIN
  -- Check if there is a period covering the entry_date
  SELECT status, period_name INTO v_period_status, v_period_name
  FROM public.accounting_periods
  WHERE start_date <= NEW.entry_date 
    AND end_date >= NEW.entry_date
  LIMIT 1;

  -- Case 1: No period found
  IF v_period_status IS NULL THEN
    RAISE EXCEPTION 'No accounting period found for date %. Please create an open period first.', 
      NEW.entry_date;
  END IF;

  -- Case 2: Period exists but is closed
  IF v_period_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot create journal entries in closed period "%" (%). Please reopen the period or adjust the entry date.', 
      v_period_name, NEW.entry_date;
  END IF;

  -- Case 3: Period is open - allow entry
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Replace old trigger with new one
DROP TRIGGER IF EXISTS enforce_accounting_period_status ON public.journal_entries;
DROP TRIGGER IF EXISTS enforce_accounting_period_open ON public.journal_entries;

CREATE TRIGGER enforce_accounting_period_open
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.check_accounting_period_open();

-- ========================================================
-- HELPER FUNCTION: Get Current Period Status
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_current_period_status()
RETURNS TABLE (
  has_period boolean,
  is_open boolean,
  period_name text,
  start_date date,
  end_date date,
  message text
) AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_period record;
BEGIN
  -- Find period for today - use explicit column names to avoid ambiguity
  SELECT 
    ap.id,
    ap.period_name,
    ap.start_date,
    ap.end_date,
    ap.status
  INTO v_period
  FROM public.accounting_periods ap
  WHERE ap.start_date <= v_today 
    AND ap.end_date >= v_today
  LIMIT 1;

  -- No period found
  IF v_period IS NULL THEN
    RETURN QUERY SELECT 
      false AS has_period,
      false AS is_open,
      NULL::text AS period_name,
      NULL::date AS start_date,
      NULL::date AS end_date,
      'No accounting period found for current month. Please create an open period.' AS message;
    RETURN;
  END IF;

  -- Period found but closed
  IF v_period.status = 'closed' THEN
    RETURN QUERY SELECT 
      true AS has_period,
      false AS is_open,
      v_period.period_name,
      v_period.start_date,
      v_period.end_date,
      format('Current period "%s" is closed. Please reopen to create journal entries.', v_period.period_name) AS message;
    RETURN;
  END IF;

  -- Period is open
  RETURN QUERY SELECT 
    true AS has_period,
    true AS is_open,
    v_period.period_name,
    v_period.start_date,
    v_period.end_date,
    'Period is open for journal entries.' AS message;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- SEED CURRENT MONTH PERIOD (if not exists)
-- ========================================================

DO $$
DECLARE
  v_start_date date := date_trunc('month', CURRENT_DATE)::date;
  v_end_date date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  v_period_name text := to_char(CURRENT_DATE, 'Month YYYY');
BEGIN
  INSERT INTO public.accounting_periods (period_name, start_date, end_date, status)
  VALUES (trim(v_period_name), v_start_date, v_end_date, 'open')
  ON CONFLICT (start_date, end_date) DO NOTHING;
  
  RAISE NOTICE 'Period % created or already exists', v_period_name;
END $$;
