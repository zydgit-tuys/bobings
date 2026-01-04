-- ========================================================
-- WAREHOUSES MANAGEMENT
-- ========================================================

-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create indexes
CREATE INDEX idx_warehouses_active ON warehouses(is_active);
CREATE INDEX idx_warehouses_default ON warehouses(is_default) WHERE is_default = true;

-- 3. Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Allow all for authenticated users" 
ON warehouses FOR ALL 
USING (true) WITH CHECK (true);

-- 5. Create trigger to ensure only one default warehouse
CREATE OR REPLACE FUNCTION ensure_single_default_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE warehouses 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_warehouse_trigger ON warehouses;

CREATE TRIGGER ensure_single_default_warehouse_trigger
BEFORE INSERT OR UPDATE ON warehouses
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION ensure_single_default_warehouse();

-- 6. Create updated_at trigger
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON warehouses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert default warehouse
INSERT INTO warehouses (code, name, is_default, is_active)
VALUES ('WH-001', 'Gudang Utama', true, true)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE warehouses IS 
'Warehouse/location management for multi-warehouse inventory tracking';
