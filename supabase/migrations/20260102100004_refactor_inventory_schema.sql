-- Refactor Inventory Schema: Split Stock into Initial, In, and Out
-- This improves auditability while maintaining stock_qty as the current balance.

-- 1. Add new columns
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS initial_stock INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_in INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_out INTEGER NOT NULL DEFAULT 0;

-- 2. Migrate existing data (Lock current stock as Initial)
-- We assume current stock_qty is the correct starting point for this new system.
UPDATE public.product_variants 
SET initial_stock = stock_qty,
    stock_in = 0,
    stock_out = 0;

-- 3. Redefine the Stock Update Trigger Function
CREATE OR REPLACE FUNCTION public.update_variant_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_qty INTEGER;
BEGIN
    -- Determine the absolute quantity moved
    v_qty := ABS(NEW.qty);

    -- Update the specific counter based on movement type
    CASE NEW.movement_type
        WHEN 'IN' THEN
            UPDATE public.product_variants
            SET stock_in = stock_in + v_qty,
                stock_qty = (initial_stock + (stock_in + v_qty) - stock_out), -- Re-calculate total
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'RETURN' THEN -- Customer Return (Stock IN)
             -- WARNING: If our system uses RETURN for Purchase Return (OUT), check logic.
             -- Based on enum: IN, OUT, ADJUSTMENT, RETURN, SALE
             -- RETURN usually implies Customer Return (IN).
             -- Purchase Return uses 'OUT' in our latest trigger.
             UPDATE public.product_variants
             SET stock_in = stock_in + v_qty,
                 stock_qty = (initial_stock + (stock_in + v_qty) - stock_out),
                 updated_at = now()
             WHERE id = NEW.variant_id;
             
        WHEN 'OUT' THEN -- Usage / Purchase Return
            UPDATE public.product_variants
            SET stock_out = stock_out + v_qty,
                stock_qty = (initial_stock + stock_in - (stock_out + v_qty)),
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'SALE' THEN -- Sales (Stock OUT)
            UPDATE public.product_variants
            SET stock_out = stock_out + v_qty,
                stock_qty = (initial_stock + stock_in - (stock_out + v_qty)),
                updated_at = now()
            WHERE id = NEW.variant_id;
            
        WHEN 'ADJUSTMENT' THEN
            IF NEW.qty >= 0 THEN
                -- Positive Adjustment = Stock In
                UPDATE public.product_variants
                SET stock_in = stock_in + v_qty,
                    stock_qty = (initial_stock + (stock_in + v_qty) - stock_out),
                    updated_at = now()
                WHERE id = NEW.variant_id;
            ELSE
                -- Negative Adjustment = Stock Out
                UPDATE public.product_variants
                SET stock_out = stock_out + v_qty,
                    stock_qty = (initial_stock + stock_in - (stock_out + v_qty)),
                    updated_at = now()
                WHERE id = NEW.variant_id;
            END IF;
    END CASE;

    RETURN NEW;
END;
$$;

-- Trigger definition remains the same (trigger_update_stock on stock_movements)
-- No need to drop/recreate trigger if name matches, just checking function content.
