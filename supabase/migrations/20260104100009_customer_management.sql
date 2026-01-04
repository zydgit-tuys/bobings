-- ============================================
-- Customer Management Module (ERP Standard)
-- ============================================

-- 1. Create SEQUENCE for order numbers (CRITICAL: Concurrency-safe)
CREATE SEQUENCE IF NOT EXISTS sales_order_seq START 1;

-- 2. Create customer_types table
CREATE TABLE IF NOT EXISTS public.customer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default customer types
INSERT INTO customer_types (code, name, discount_percentage, description) VALUES
  ('RETAIL', 'Retail', 0, 'End customer - no discount'),
  ('WHOLESALE', 'Wholesale', 10, 'Wholesaler - 10% discount'),
  ('DISTRIBUTOR', 'Distributor', 15, 'Distributor - 15% discount'),
  ('RESELLER', 'Reseller', 5, 'Reseller - 5% discount')
ON CONFLICT (code) DO NOTHING;

-- 3. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  customer_type_id uuid REFERENCES customer_types(id),
  email text,
  phone text,
  address text,
  city text,
  contact_person text,
  tax_id text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create customer_pricing table (DORMANT for v2 - NO UI in MVP)
CREATE TABLE IF NOT EXISTS public.customer_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  special_price numeric(15,2) NOT NULL CHECK (special_price >= 0),
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, variant_id)
);

-- 5. ALTER sales_orders - Add customer_id and FROZEN PRICING columns
DO $$ 
BEGIN
  -- Add customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN customer_id uuid REFERENCES customers(id);
  END IF;

  -- Add frozen pricing columns (CRITICAL: ERP requirement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'base_amount'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN base_amount numeric(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN discount_amount numeric(15,2) DEFAULT 0;
  END IF;

  -- Change default status to pending
  ALTER TABLE sales_orders ALTER COLUMN status SET DEFAULT 'pending';
END $$;

-- 6. Create RPC function using SEQUENCE (CRITICAL: Thread-safe)
CREATE OR REPLACE FUNCTION generate_sales_order_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'SO-' || LPAD(nextval('sales_order_seq')::text, 5, '0');
END;
$$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_customer ON customer_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_variant ON customer_pricing(variant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);

-- 8. Enable RLS on new tables
ALTER TABLE customer_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (idempotent - drop if exists first)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customer_types;
CREATE POLICY "Enable read access for authenticated users" ON customer_types
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
CREATE POLICY "Enable all access for authenticated users" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customer_pricing;
CREATE POLICY "Enable all access for authenticated users" ON customer_pricing
  FOR ALL USING (auth.role() = 'authenticated');

-- 10. Create updated_at trigger for customers (idempotent)
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

DROP TRIGGER IF EXISTS customer_pricing_updated_at ON customer_pricing;
CREATE TRIGGER customer_pricing_updated_at
  BEFORE UPDATE ON customer_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- 11. Add helpful comments
COMMENT ON SEQUENCE sales_order_seq IS 'Auto-increment sequence for sales order numbers (thread-safe)';
COMMENT ON TABLE customer_types IS 'Customer classification types with default discount percentages';
COMMENT ON TABLE customers IS 'Customer master data - similar to suppliers but for sales';
COMMENT ON TABLE customer_pricing IS 'Customer-specific pricing overrides (DORMANT in MVP, for v2)';
COMMENT ON COLUMN customers.customer_type_id IS 'Determines default discount percentage for pricing';
COMMENT ON COLUMN sales_orders.base_amount IS 'Total before discount (frozen at order creation)';
COMMENT ON COLUMN sales_orders.discount_percentage IS 'Discount % from customer type (frozen at order creation)';
COMMENT ON COLUMN sales_orders.discount_amount IS 'Calculated discount amount (frozen at order creation)';
COMMENT ON FUNCTION generate_sales_order_no IS 'Auto-generates sequential sales order numbers using sequence (SO-00001)';
