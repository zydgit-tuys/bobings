-- ========================================================
-- NEGATIVE STOCK PREVENTION
-- ========================================================

-- 1. Add override column to stock_movements
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS allow_negative BOOLEAN DEFAULT false;

COMMENT ON COLUMN stock_movements.allow_negative IS 
'Allow this movement to result in negative stock (for authorized adjustments only)';

-- 2. Create validation function
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
  SELECT 
    pv.current_stock,
    p.name || ' - ' || pv.name as variant_name,
    pv.sku_variant
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.id = NEW.variant_id;

  v_current_stock := v_variant_info.current_stock;

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

-- 3. Create trigger
DROP TRIGGER IF EXISTS prevent_negative_stock_trigger ON stock_movements;

CREATE TRIGGER prevent_negative_stock_trigger
BEFORE INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION check_negative_stock();

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_qty 
ON stock_movements(variant_id, qty) 
WHERE qty < 0;

COMMENT ON TRIGGER prevent_negative_stock_trigger ON stock_movements IS 
'Prevents stock from going negative unless allow_negative is explicitly set to true';
