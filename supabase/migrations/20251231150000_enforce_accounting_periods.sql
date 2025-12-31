
-- Function to check if the accounting period is open for a given date
CREATE OR REPLACE FUNCTION public.check_accounting_period_status()
RETURNS TRIGGER AS $$
DECLARE
  v_closed_period_name text;
BEGIN
  -- Check if there is ANY closed period covering the entry_date
  SELECT period_name INTO v_closed_period_name
  FROM public.accounting_periods
  WHERE start_date <= NEW.entry_date 
    AND end_date >= NEW.entry_date
    AND status = 'closed'
  LIMIT 1;

  -- If found, block it
  IF v_closed_period_name IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify journal entries in a closed accounting period (%)', v_closed_period_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce the check on INSERT and UPDATE of journal_entries
DROP TRIGGER IF EXISTS enforce_accounting_period_status ON public.journal_entries;

CREATE TRIGGER enforce_accounting_period_status
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.check_accounting_period_status();
