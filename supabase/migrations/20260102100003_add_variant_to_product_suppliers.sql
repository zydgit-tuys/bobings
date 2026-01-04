-- Add variant_id to product_suppliers
ALTER TABLE public.product_suppliers 
ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- Drop old unique constraint and add new one that includes variant_id
-- We need to handle the case where variant_id is NULL (all variants)
ALTER TABLE public.product_suppliers DROP CONSTRAINT IF EXISTS product_suppliers_product_id_supplier_id_key;

-- Using a unique index to handle NULLs correctly in a unique constraint
CREATE UNIQUE INDEX product_suppliers_unique_idx 
ON public.product_suppliers (product_id, supplier_id, (COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- Add comment
COMMENT ON COLUMN public.product_suppliers.variant_id IS 'If NULL, this price applies to all variants of the product. If set, applies only to that specific variant.';
