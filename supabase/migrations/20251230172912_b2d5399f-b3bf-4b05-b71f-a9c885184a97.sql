-- Add columns to products table
ALTER TABLE public.products 
ADD COLUMN images text[] DEFAULT '{}',
ADD COLUMN virtual_stock boolean NOT NULL DEFAULT false,
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Add virtual stock qty to product_variants
ALTER TABLE public.product_variants 
ADD COLUMN virtual_stock_qty integer NOT NULL DEFAULT 0;