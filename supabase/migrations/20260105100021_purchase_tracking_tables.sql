-- ============================================
-- PURCHASE TRACKING TABLES
-- ============================================
-- Add proper tracking for partial receipts and payments
-- This improves audit trail and makes it easier to trace history

-- ============================================
-- 1. PURCHASE RECEIPTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT NOT NULL UNIQUE,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_receipt_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    purchase_line_id UUID NOT NULL REFERENCES public.purchase_order_lines(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    received_qty INTEGER NOT NULL CHECK (received_qty > 0),
    unit_cost DECIMAL(15,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. PURCHASE PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.purchase_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no TEXT NOT NULL UNIQUE,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_purchase_id ON public.purchase_receipts(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_receipt_date ON public.purchase_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_journal_entry_id ON public.purchase_receipts(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_receipt_id ON public.purchase_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_purchase_line_id ON public.purchase_receipt_lines(purchase_line_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_lines_variant_id ON public.purchase_receipt_lines(variant_id);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id ON public.purchase_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_payment_date ON public.purchase_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_journal_entry_id ON public.purchase_payments(journal_entry_id);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Purchase Receipts
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.purchase_receipts;
CREATE POLICY "Enable read for authenticated users" ON public.purchase_receipts 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.purchase_receipts;
CREATE POLICY "Enable insert for authenticated users" ON public.purchase_receipts 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.purchase_receipts;
CREATE POLICY "Enable update for authenticated users" ON public.purchase_receipts 
    FOR UPDATE USING (true);

-- Purchase Receipt Lines
ALTER TABLE public.purchase_receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.purchase_receipt_lines;
CREATE POLICY "Enable read for authenticated users" ON public.purchase_receipt_lines 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.purchase_receipt_lines;
CREATE POLICY "Enable insert for authenticated users" ON public.purchase_receipt_lines 
    FOR INSERT WITH CHECK (true);

-- Purchase Payments
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.purchase_payments;
CREATE POLICY "Enable read for authenticated users" ON public.purchase_payments 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.purchase_payments;
CREATE POLICY "Enable insert for authenticated users" ON public.purchase_payments 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.purchase_payments;
CREATE POLICY "Enable update for authenticated users" ON public.purchase_payments 
    FOR UPDATE USING (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Calculate total received amount for a purchase
CREATE OR REPLACE FUNCTION public.get_total_received_amount(p_purchase_id UUID)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total
    FROM public.purchase_receipts
    WHERE purchase_id = p_purchase_id;
    
    RETURN v_total;
END;
$$;

-- Calculate total paid amount for a purchase
CREATE OR REPLACE FUNCTION public.get_total_paid_amount(p_purchase_id UUID)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total
    FROM public.purchase_payments
    WHERE purchase_id = p_purchase_id;
    
    RETURN v_total;
END;
$$;

-- ============================================
-- 6. AUTO STATUS UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_purchase_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_purchase RECORD;
    v_total_received DECIMAL(15,2);
    v_total_paid DECIMAL(15,2);
    v_new_status public.purchase_status;
BEGIN
    -- Get purchase details
    SELECT * INTO v_purchase FROM public.purchases WHERE id = NEW.purchase_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Calculate totals
    v_total_received := public.get_total_received_amount(NEW.purchase_id);
    v_total_paid := public.get_total_paid_amount(NEW.purchase_id);
    
    -- Determine new status
    IF v_total_received = 0 THEN
        v_new_status := 'draft';
    ELSIF v_total_received < v_purchase.total_amount THEN
        v_new_status := 'partial';
    ELSIF v_total_received >= v_purchase.total_amount AND v_total_paid < v_purchase.total_amount THEN
        v_new_status := 'received';
    ELSIF v_total_paid >= v_purchase.total_amount THEN
        v_new_status := 'completed';
    ELSE
        v_new_status := v_purchase.status; -- Keep current if logic doesn't match
    END IF;
    
    -- Update purchase status if changed
    IF v_new_status IS DISTINCT FROM v_purchase.status THEN
        UPDATE public.purchases
        SET status = v_new_status,
            updated_at = now()
        WHERE id = NEW.purchase_id;
        
        RAISE NOTICE 'Purchase % status updated: % -> %', v_purchase.purchase_no, v_purchase.status, v_new_status;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_purchase_status_on_receipt ON public.purchase_receipts;
CREATE TRIGGER trg_update_purchase_status_on_receipt
AFTER INSERT ON public.purchase_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_purchase_status();

DROP TRIGGER IF EXISTS trg_update_purchase_status_on_payment ON public.purchase_payments;
CREATE TRIGGER trg_update_purchase_status_on_payment
AFTER INSERT ON public.purchase_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_purchase_status();


-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE public.purchase_receipts IS 'Tracks each goods receipt for purchase orders (supports partial receipts)';
COMMENT ON TABLE public.purchase_receipt_lines IS 'Line items for each receipt showing qty and cost per item';
COMMENT ON TABLE public.purchase_payments IS 'Tracks each payment made for purchase orders (supports partial payments)';

COMMENT ON FUNCTION public.get_total_received_amount(UUID) IS 'Calculate total amount received for a purchase order';
COMMENT ON FUNCTION public.get_total_paid_amount(UUID) IS 'Calculate total amount paid for a purchase order';
COMMENT ON FUNCTION public.update_purchase_status() IS 'Auto-update purchase status based on receipt and payment totals';

DO $$
BEGIN
    RAISE NOTICE '✅ Purchase tracking tables created successfully';
END $$;
