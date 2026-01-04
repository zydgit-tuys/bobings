-- ========================================================
-- STOCK OPNAME (PHYSICAL COUNT)
-- ========================================================

-- 1. Create stock_opname table
CREATE TABLE IF NOT EXISTS stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_no TEXT UNIQUE NOT NULL,
  opname_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID REFERENCES warehouses(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  notes TEXT,
  
  -- Confirmation
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create stock_opname_lines table
CREATE TABLE IF NOT EXISTS stock_opname_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES stock_opname(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  system_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  physical_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  difference_qty DECIMAL(10,2) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX idx_stock_opname_date ON stock_opname(opname_date DESC);
CREATE INDEX idx_stock_opname_warehouse ON stock_opname(warehouse_id, opname_date DESC);
CREATE INDEX idx_stock_opname_status ON stock_opname(status);
CREATE INDEX idx_opname_lines_opname ON stock_opname_lines(opname_id);
CREATE INDEX idx_opname_lines_variant ON stock_opname_lines(variant_id);

-- 4. Enable RLS
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_lines ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Allow all for authenticated users" 
ON stock_opname FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON stock_opname_lines FOR ALL 
USING (true) WITH CHECK (true);

-- 6. Create auto-increment function for opname_no
CREATE OR REPLACE FUNCTION generate_opname_no()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq INT;
  v_opname_no TEXT;
BEGIN
  IF NEW.opname_no IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_year := TO_CHAR(NEW.opname_date, 'YY');
  v_month := TO_CHAR(NEW.opname_date, 'MM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(opname_no FROM 'OPN/\d+/\d+/(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM stock_opname
  WHERE opname_no ~ ('^OPN/' || v_year || '/' || v_month || '/');

  v_opname_no := 'OPN/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 4, '0');
  NEW.opname_no := v_opname_no;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
DROP TRIGGER IF EXISTS set_opname_no ON stock_opname;

CREATE TRIGGER set_opname_no
BEFORE INSERT ON stock_opname
FOR EACH ROW
EXECUTE FUNCTION generate_opname_no();

-- 8. Create updated_at trigger
CREATE TRIGGER update_stock_opname_updated_at
BEFORE UPDATE ON stock_opname
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_opname IS 
'Stock opname (physical count) records';

COMMENT ON TABLE stock_opname_lines IS 
'Line items for stock opname showing system vs physical quantities';
