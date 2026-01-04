-- Create sales_returns table
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    return_no TEXT NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    reason TEXT,
    total_refund NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sales_return_lines table
CREATE TABLE IF NOT EXISTS public.sales_return_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    sales_order_line_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON public.sales_returns(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_lines_return_id ON public.sales_return_lines(return_id);

-- Enable RLS (Permissive for now as per previous pattern)
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.sales_returns
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.sales_returns
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.sales_returns
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON public.sales_return_lines
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.sales_return_lines
    FOR INSERT TO authenticated WITH CHECK (true);

-- Function to generate return number
CREATE OR REPLACE FUNCTION generate_sales_return_number()
RETURNS TRIGGER AS $$
DECLARE
    date_part TEXT;
    sequence_part INTEGER;
BEGIN
    date_part := to_char(NEW.return_date, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(SUBSTRING(return_no FROM 12)::INTEGER), 0) + 1
    INTO sequence_part
    FROM public.sales_returns
    WHERE to_char(return_date, 'YYYYMMDD') = date_part;

    NEW.return_no := 'SR-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sales_return_number
    BEFORE INSERT ON public.sales_returns
    FOR EACH ROW
    WHEN (NEW.return_no IS NULL)
    EXECUTE FUNCTION generate_sales_return_number();
