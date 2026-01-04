-- ============================================
-- Priority 1: Product Database Enhancement
-- ============================================

-- 1. Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Insert default units
INSERT INTO units (code, name, symbol) VALUES
  ('PCS', 'Pieces', 'pcs'),
  ('BOX', 'Box', 'box'),
  ('DOZEN', 'Dozen', 'dz'),
  ('KG', 'Kilogram', 'kg'),
  ('GRAM', 'Gram', 'g'),
  ('LITER', 'Liter', 'L'),
  ('METER', 'Meter', 'm'),
  ('SET', 'Set', 'set')
ON CONFLICT (code) DO NOTHING;

-- Indexes for units
CREATE INDEX IF NOT EXISTS idx_units_code ON units(code);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active);

-- ============================================
-- 2. Alter products table
-- ============================================

-- Add new columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS base_hpp numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES units(id);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_unit ON products(unit_id);

-- Set default unit for existing products
UPDATE products 
SET unit_id = (SELECT id FROM units WHERE code = 'PCS' LIMIT 1)
WHERE unit_id IS NULL;

-- ============================================
-- 3. Alter product_variants table
-- ============================================

-- Add new columns to product_variants
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS reserved_qty integer DEFAULT 0 NOT NULL;

-- Add generated column for available_qty
-- Note: PostgreSQL 12+ supports GENERATED ALWAYS AS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_variants' 
    AND column_name = 'available_qty'
  ) THEN
    ALTER TABLE product_variants
      ADD COLUMN available_qty integer GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED;
  END IF;
END $$;

-- Indexes for product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON product_variants(available_qty);

-- ============================================
-- 4. Create product_images table
-- ============================================

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  is_primary boolean DEFAULT false,
  alt_text text,
  file_size integer,
  width integer,
  height integer,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes for product_images
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, display_order);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary 
  ON product_images(product_id) 
  WHERE is_primary = true;

-- ============================================
-- 5. Row Level Security for product_images
-- ============================================

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can insert product images" ON product_images;
DROP POLICY IF EXISTS "Users can update their uploaded images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their uploaded images" ON product_images;

-- Create RLS policies
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert product images"
  ON product_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their uploaded images"
  ON product_images FOR UPDATE
  USING (auth.uid() = uploaded_by OR auth.role() = 'service_role');

CREATE POLICY "Users can delete their uploaded images"
  ON product_images FOR DELETE
  USING (auth.uid() = uploaded_by OR auth.role() = 'service_role');

-- ============================================
-- 6. Verification queries
-- ============================================

-- Check tables exist
DO $$
BEGIN
  RAISE NOTICE 'Verification: Checking tables...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') THEN
    RAISE NOTICE '✓ units table exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images') THEN
    RAISE NOTICE '✓ product_images table exists';
  END IF;
END $$;

-- Check columns exist
DO $$
BEGIN
  RAISE NOTICE 'Verification: Checking columns...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'base_hpp') THEN
    RAISE NOTICE '✓ products.base_hpp exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') THEN
    RAISE NOTICE '✓ products.barcode exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_id') THEN
    RAISE NOTICE '✓ products.unit_id exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'barcode') THEN
    RAISE NOTICE '✓ product_variants.barcode exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'reserved_qty') THEN
    RAISE NOTICE '✓ product_variants.reserved_qty exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'available_qty') THEN
    RAISE NOTICE '✓ product_variants.available_qty exists';
  END IF;
END $$;
