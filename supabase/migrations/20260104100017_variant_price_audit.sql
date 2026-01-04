-- ========================================================
-- PRODUCT VARIANT PRICE AUDIT TRAIL
-- ========================================================

-- 1. Create price history table
CREATE TABLE IF NOT EXISTS product_variant_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  
  -- Old values
  old_harga_jual_umum DECIMAL(12,2),
  old_harga_jual_khusus DECIMAL(12,2),
  old_hpp DECIMAL(12,2),
  
  -- New values
  new_harga_jual_umum DECIMAL(12,2),
  new_harga_jual_khusus DECIMAL(12,2),
  new_hpp DECIMAL(12,2),
  
  -- Audit info
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create indexes
CREATE INDEX idx_price_history_variant ON product_variant_price_history(variant_id, changed_at DESC);
CREATE INDEX idx_price_history_changed_by ON product_variant_price_history(changed_by);

-- 3. Enable RLS
ALTER TABLE product_variant_price_history ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Allow read access for authenticated users" 
ON product_variant_price_history FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON product_variant_price_history FOR INSERT 
WITH CHECK (true);

-- 5. Create audit trigger function
CREATE OR REPLACE FUNCTION audit_variant_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if any price changed
  IF (OLD.harga_jual_umum IS DISTINCT FROM NEW.harga_jual_umum) OR
     (OLD.harga_jual_khusus IS DISTINCT FROM NEW.harga_jual_khusus) OR
     (OLD.hpp IS DISTINCT FROM NEW.hpp) THEN
    
    INSERT INTO product_variant_price_history (
      variant_id,
      old_harga_jual_umum, new_harga_jual_umum,
      old_harga_jual_khusus, new_harga_jual_khusus,
      old_hpp, new_hpp,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.harga_jual_umum, NEW.harga_jual_umum,
      OLD.harga_jual_khusus, NEW.harga_jual_khusus,
      OLD.hpp, NEW.hpp,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger
DROP TRIGGER IF EXISTS audit_variant_price_trigger ON product_variants;

CREATE TRIGGER audit_variant_price_trigger
AFTER UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION audit_variant_price();

COMMENT ON TABLE product_variant_price_history IS 
'Audit trail for product variant price changes';

COMMENT ON TRIGGER audit_variant_price_trigger ON product_variants IS 
'Automatically logs price changes to price history table';
