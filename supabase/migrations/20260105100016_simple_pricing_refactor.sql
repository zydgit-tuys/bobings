-- ============================================
-- SIMPLE PRICING REFACTOR - Total Cleanup
-- ============================================
-- Simplify from 4-table complex pricing to 2-column simple pricing
-- customer_type: 'umum' | 'khusus'
-- harga_jual_umum, harga_khusus in product_variants

-- PHASE 1: DROP COMPLEX TABLES
-- ============================================

-- Drop complex pricing tables
DROP TABLE IF EXISTS customer_type_pricing CASCADE;
DROP TABLE IF EXISTS customer_pricing CASCADE;
DROP TABLE IF EXISTS customer_types CASCADE;

-- Remove customer_type_id foreign key from customers
ALTER TABLE customers DROP COLUMN IF EXISTS customer_type_id CASCADE;

-- Remove frozen discount columns from sales_orders (simplify)
ALTER TABLE sales_orders DROP COLUMN IF EXISTS base_amount CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS discount_percentage CASCADE;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS discount_amount CASCADE;

-- PHASE 2: ADD SIMPLE COLUMNS
-- ============================================

-- Add 2 price columns to product_variants
ALTER TABLE product_variants 
  ADD COLUMN IF NOT EXISTS harga_jual_umum numeric(15,2) DEFAULT 0 CHECK (harga_jual_umum >= 0),
  ADD COLUMN IF NOT EXISTS harga_khusus numeric(15,2) DEFAULT 0 CHECK (harga_khusus >= 0);

-- Add simple customer_type enum to customers
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'umum' 
  CHECK (customer_type IN ('umum', 'khusus'));

-- PHASE 3: INDEXES & COMMENTS
-- ============================================

-- Create index for customer_type queries
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- Add helpful comments
COMMENT ON COLUMN product_variants.harga_jual_umum IS 'Harga jual untuk customer tipe Umum';
COMMENT ON COLUMN product_variants.harga_khusus IS 'Harga jual untuk customer tipe Khusus (special pricing)';
COMMENT ON COLUMN customers.customer_type IS 'Tipe customer: umum (regular) atau khusus (special pricing)';

-- PHASE 4: DATA MIGRATION (Optional)
-- ============================================

-- Set default prices for existing variants
-- harga_jual_umum = current price
-- harga_khusus = 80% of current price (example discount)
UPDATE product_variants 
SET 
  harga_jual_umum = COALESCE(price, 0),
  harga_khusus = COALESCE(price * 0.8, 0)
WHERE harga_jual_umum = 0 OR harga_khusus = 0;

-- Set all existing customers to 'umum' type
UPDATE customers 
SET customer_type = 'umum'
WHERE customer_type IS NULL;

-- PHASE 5: CLEANUP OLD FUNCTIONS (if any)
-- ============================================

-- Drop any old RPC functions related to complex pricing (safe to run)
DROP FUNCTION IF EXISTS get_customer_type_pricing(uuid, uuid);
DROP FUNCTION IF EXISTS get_effective_price(uuid, uuid, numeric);

COMMENT ON TABLE customers IS 'Customer master data with simple type classification (umum/khusus)';
COMMENT ON TABLE product_variants IS 'Product variants with 2 selling prices: harga_jual_umum and harga_khusus';
