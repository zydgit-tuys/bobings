-- Create accounting periods table
CREATE TABLE public.accounting_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(start_date, end_date)
);

-- Enable RLS
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access" ON public.accounting_periods
FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_accounting_periods_updated_at
BEFORE UPDATE ON public.accounting_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();