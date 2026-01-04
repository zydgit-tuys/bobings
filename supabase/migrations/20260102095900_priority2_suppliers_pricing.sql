-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policy for suppliers (Allow public access consistent with other tables)
DROP POLICY IF EXISTS "Allow public access" ON public.suppliers;
CREATE POLICY "Allow public access" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- Create product_suppliers table
CREATE TABLE IF NOT EXISTS public.product_suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    purchase_price NUMERIC,
    currency TEXT DEFAULT 'IDR',
    is_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, supplier_id)
);

-- Enable RLS for product_suppliers
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- Policy for product_suppliers
DROP POLICY IF EXISTS "Allow public access" ON public.product_suppliers;
CREATE POLICY "Allow public access" ON public.product_suppliers FOR ALL USING (true) WITH CHECK (true);

-- Alter products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight') THEN
        ALTER TABLE public.products ADD COLUMN weight NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'dimensions') THEN
        ALTER TABLE public.products ADD COLUMN dimensions TEXT;
    END IF;
END $$;

-- Alter product_variants table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'price') THEN
        ALTER TABLE public.product_variants ADD COLUMN price NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'cost_price') THEN
        ALTER TABLE public.product_variants ADD COLUMN cost_price NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Create product_price_history table
CREATE TABLE IF NOT EXISTS public.product_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    price NUMERIC,
    cost_price NUMERIC,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for product_price_history
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- Policy for product_price_history
DROP POLICY IF EXISTS "Allow public access" ON public.product_price_history;
CREATE POLICY "Allow public access" ON public.product_price_history FOR ALL USING (true) WITH CHECK (true);
