-- ========================================================
-- ATOMIC INVENTORY ADJUSTMENT RPC (Rule #2 & #7)
-- ========================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory_atomic(
    p_variant_id UUID,
    p_qty INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_movement_id UUID;
BEGIN
    -- 1. Lock the variant row to prevent race conditions
    SELECT stock_qty INTO v_current_stock
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product variant not found';
    END IF;

    -- 2. Validate sufficient stock (Rule #9: Validation Keras)
    v_new_stock := v_current_stock + p_qty;
    
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested Adjustment: %', v_current_stock, p_qty;
    END IF;

    -- 3. Insert Stock Movement
    -- This insert will fire 'trigger_update_stock' which updates product_variants.stock_qty
    -- We pass the SIGNED p_qty. The trigger logic for 'ADJUSTMENT' handles +/- correctly.
    INSERT INTO public.stock_movements (
        variant_id,
        movement_type,
        qty,
        notes,
        created_at
    ) VALUES (
        p_variant_id,
        'ADJUSTMENT',
        p_qty,
        COALESCE(p_notes, 'Manual Adjustment via RPC'),
        NOW()
    ) RETURNING id INTO v_movement_id;

    -- 4. Return result
    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock
    );
END;
$$;
