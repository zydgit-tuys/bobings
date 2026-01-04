-- Migration: Fix Audit Findings (Database Integrity)
-- Date: 2026-01-05

-- 1. Inventory Integrity: No Negative Stock (Database Level)
-- Use DO block to safely add constraint only if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_non_negative'
    ) THEN
        ALTER TABLE public.product_variants
        ADD CONSTRAINT check_stock_non_negative CHECK (stock_qty >= 0);
    END IF;
END $$;

-- 2. Referential Integrity: Sales Return Lines -> Sales Order Lines
-- This ensures that if a sales order line is referenced, it exists.
-- ON DELETE RESTRICT ensures we can't delete a sales order line if a return exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_return_lines_order_item'
    ) THEN
        ALTER TABLE public.sales_return_lines
        ADD CONSTRAINT fk_sales_return_lines_order_item
        FOREIGN KEY (sales_order_line_id) 
        REFERENCES public.order_items(id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. Referential Integrity: Stock Movements -> Product Variants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_movements_variant'
    ) THEN
        ALTER TABLE public.stock_movements
        ADD CONSTRAINT fk_stock_movements_variant
        FOREIGN KEY (variant_id) 
        REFERENCES public.product_variants(id)
        ON DELETE RESTRICT;
    END IF;
END $$;


