-- ============================================
-- Customer Type Pricing Feature
-- ============================================
-- Allows setting custom prices per customer type per variant
-- E.g., Reseller gets 80k for SKU CDS001, Grosir gets 75k

CREATE TABLE IF NOT EXISTS public.customer_type_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type_id uuid NOT NULL REFERENCES customer_types(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price numeric(15,2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_type_id, variant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_type_pricing_type ON customer_type_pricing(customer_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_type_pricing_variant ON customer_type_pricing(variant_id);

-- Enable RLS
ALTER TABLE customer_type_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policy (idempotent)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customer_type_pricing;
CREATE POLICY "Enable all access for authenticated users" ON customer_type_pricing
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS customer_type_pricing_updated_at ON customer_type_pricing;
CREATE TRIGGER customer_type_pricing_updated_at
  BEFORE UPDATE ON customer_type_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Add helpful comment
COMMENT ON TABLE customer_type_pricing IS 'Custom pricing per customer type per product variant (e.g., all Resellers get 80k for CDS001)';
COMMENT ON COLUMN customer_type_pricing.customer_type_id IS 'Customer type (Umum, Reseller, Grosir, etc.)';
COMMENT ON COLUMN customer_type_pricing.variant_id IS 'Product variant (specific SKU)';
COMMENT ON COLUMN customer_type_pricing.price IS 'Custom selling price for this type + variant combination';
