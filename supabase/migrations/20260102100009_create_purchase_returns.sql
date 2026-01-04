-- Create Purchase Return Status Enum
CREATE TYPE purchase_return_status AS ENUM ('draft', 'completed');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Purchase Returns Table
CREATE TABLE purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  return_no TEXT NOT NULL UNIQUE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status purchase_return_status NOT NULL DEFAULT 'draft',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Purchase Return Lines Table
CREATE TABLE purchase_return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  purchase_line_id UUID NOT NULL REFERENCES purchase_order_lines(id) ON DELETE CASCADE,
  qty NUMERIC NOT NULL CHECK (qty > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to generate Return Number (PR-YYYYMM-0001)
CREATE OR REPLACE FUNCTION generate_return_no()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INT;
BEGIN
  -- Format: PR-YYYYMM-XXXX
  prefix := 'PR-' || to_char(NEW.return_date, 'YYYYMM') || '-';
  
  -- Find max sequence for this month
  SELECT COALESCE(MAX(SUBSTRING(return_no FROM LENGTH(prefix) + 1)::INT), 0) + 1
  INTO seq
  FROM purchase_returns
  WHERE return_no LIKE prefix || '%';

  -- Set the new return number
  NEW.return_no := prefix || LPAD(seq::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Return Number
CREATE TRIGGER set_return_no
BEFORE INSERT ON purchase_returns
FOR EACH ROW
EXECUTE FUNCTION generate_return_no();

-- Trigger for Updated At
CREATE TRIGGER update_purchase_returns_modtime
BEFORE UPDATE ON purchase_returns
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- RLS Policies (Simple for now, matching Purchases)
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON purchase_returns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON purchase_return_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
