-- ========================================================
-- FIX: Negative Stock Validation Function
-- Replace 'current_stock' (incorrect) with 'stock_qty' (correct)
-- ========================================================

CREATE OR REPLACE FUNCTION check_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock DECIMAL;
  v_new_stock DECIMAL;
  v_variant_info RECORD;
BEGIN
  -- Only check for outbound movements (negative qty)
  IF NEW.qty >= 0 THEN
    RETURN NEW;
  END IF;

  -- Get current stock and variant info
  -- FIX: Use stock_qty instead of current_stock
  -- FIX: Use sku_variant for name composition as pv.name might not exist
  SELECT 
    pv.stock_qty,
    p.name || ' (' || COALESCE(pv.sku_variant, '-') || ')' as variant_name,
    pv.sku_variant
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.id = NEW.variant_id;

  v_current_stock := v_variant_info.stock_qty;

  -- Calculate new stock after this movement
  v_new_stock := v_current_stock + NEW.qty;

  -- Check if stock would go negative
  IF v_new_stock < 0 AND NOT COALESCE(NEW.allow_negative, false) THEN
    RAISE EXCEPTION 'Stok tidak mencukupi untuk % (SKU: %). Stok saat ini: %, Diminta: %, Kekurangan: %',
      v_variant_info.variant_name,
      v_variant_info.sku_variant,
      v_current_stock,
      ABS(NEW.qty),
      ABS(v_new_stock);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
