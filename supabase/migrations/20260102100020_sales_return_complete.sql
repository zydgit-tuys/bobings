-- Unified Migration for Sales Return Module
-- 1. Create Tables
-- 2. Create Stock Trigger
-- 3. Setup RLS

-- SECTION 1: TABLES
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

CREATE TABLE IF NOT EXISTS public.sales_return_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    sales_order_line_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON public.sales_returns(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_lines_return_id ON public.sales_return_lines(return_id);

-- RLS
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_lines ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_returns' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.sales_returns FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_returns' AND policyname = 'Enable insert access for authenticated users') THEN
        CREATE POLICY "Enable insert access for authenticated users" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_returns' AND policyname = 'Enable update access for authenticated users') THEN
        CREATE POLICY "Enable update access for authenticated users" ON public.sales_returns FOR UPDATE TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_return_lines' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.sales_return_lines FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_return_lines' AND policyname = 'Enable insert access for authenticated users') THEN
        CREATE POLICY "Enable insert access for authenticated users" ON public.sales_return_lines FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- Generate Return Number Trigger
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

DROP TRIGGER IF EXISTS set_sales_return_number ON public.sales_returns;
CREATE TRIGGER set_sales_return_number
    BEFORE INSERT ON public.sales_returns
    FOR EACH ROW
    WHEN (NEW.return_no IS NULL)
    EXECUTE FUNCTION generate_sales_return_number();


-- SECTION 2: STOCK TRIGGER
CREATE OR REPLACE FUNCTION public.process_sales_return_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line RECORD;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        
        FOR line IN 
            SELECT srl.*, oi.variant_id
            FROM public.sales_return_lines srl
            JOIN public.order_items oi ON srl.sales_order_line_id = oi.id
            WHERE srl.return_id = NEW.id
        LOOP
            INSERT INTO public.stock_movements (
                variant_id,
                movement_type,
                qty,
                reference_type,
                reference_id,
                notes,
                created_by
            ) VALUES (
                line.variant_id,
                'RETURN', 
                line.qty,
                'sales_return',
                NEW.id,
                'Sales Return: ' || NEW.return_no,
                auth.uid()
            );
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sales_return_stock ON public.sales_returns;
CREATE TRIGGER trigger_sales_return_stock
    AFTER UPDATE OF status ON public.sales_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.process_sales_return_stock();
