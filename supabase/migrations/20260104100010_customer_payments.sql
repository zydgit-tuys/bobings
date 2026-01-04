-- ========================================================
-- CUSTOMER PAYMENTS
-- ========================================================

-- 1. Create customer_payments table
CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no TEXT UNIQUE NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'giro')),
  bank_account_id UUID REFERENCES bank_accounts(id),
  reference_no TEXT,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create payment allocations table
CREATE TABLE IF NOT EXISTS customer_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES customer_payments(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX idx_customer_payments_customer ON customer_payments(customer_id, payment_date DESC);
CREATE INDEX idx_customer_payments_date ON customer_payments(payment_date DESC);
CREATE INDEX idx_payment_allocations_payment ON customer_payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_sales ON customer_payment_allocations(sales_order_id);

-- 4. Enable RLS
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_allocations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Allow all for authenticated users" 
ON customer_payments FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" 
ON customer_payment_allocations FOR ALL 
USING (true) WITH CHECK (true);

-- 6. Create auto-increment function for payment_no
CREATE OR REPLACE FUNCTION generate_payment_no()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq INT;
  v_payment_no TEXT;
BEGIN
  IF NEW.payment_no IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_year := TO_CHAR(NEW.payment_date, 'YY');
  v_month := TO_CHAR(NEW.payment_date, 'MM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(payment_no FROM 'PAY/\d+/\d+/(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM customer_payments
  WHERE payment_no ~ ('^PAY/' || v_year || '/' || v_month || '/');

  v_payment_no := 'PAY/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 4, '0');
  NEW.payment_no := v_payment_no;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
DROP TRIGGER IF EXISTS set_payment_no ON customer_payments;

CREATE TRIGGER set_payment_no
BEFORE INSERT ON customer_payments
FOR EACH ROW
EXECUTE FUNCTION generate_payment_no();

-- 8. Create updated_at trigger
CREATE TRIGGER update_customer_payments_updated_at
BEFORE UPDATE ON customer_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE customer_payments IS 
'Customer payments for accounts receivable collection';

COMMENT ON TABLE customer_payment_allocations IS 
'Allocation of customer payments to specific sales orders';
