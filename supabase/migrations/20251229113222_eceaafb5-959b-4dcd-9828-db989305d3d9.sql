
-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PURCHASES TABLE (Purchase Orders)
-- =============================================
CREATE TYPE public.purchase_status AS ENUM ('draft', 'ordered', 'partial', 'received', 'cancelled');

CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_no TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status public.purchase_status NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_qty INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PURCHASE ORDER LINES TABLE
-- =============================================
CREATE TABLE public.purchase_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    qty_ordered INTEGER NOT NULL DEFAULT 0,
    qty_received INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_suppliers_code ON public.suppliers(code);
CREATE INDEX idx_suppliers_name ON public.suppliers(name);
CREATE INDEX idx_suppliers_active ON public.suppliers(is_active);

CREATE INDEX idx_purchases_no ON public.purchases(purchase_no);
CREATE INDEX idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_purchases_date ON public.purchases(order_date);

CREATE INDEX idx_pol_purchase ON public.purchase_order_lines(purchase_id);
CREATE INDEX idx_pol_variant ON public.purchase_order_lines(variant_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.purchase_order_lines FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update timestamps for suppliers
CREATE TRIGGER update_suppliers_updated_at 
BEFORE UPDATE ON public.suppliers 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update timestamps for purchases
CREATE TRIGGER update_purchases_updated_at 
BEFORE UPDATE ON public.purchases 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Calculate purchase totals
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_purchase_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_amount DECIMAL(15,2);
    v_total_qty INTEGER;
    v_purchase_id UUID;
BEGIN
    -- Get the purchase_id from either NEW or OLD record
    IF TG_OP = 'DELETE' THEN
        v_purchase_id := OLD.purchase_id;
    ELSE
        v_purchase_id := NEW.purchase_id;
    END IF;

    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(qty_ordered), 0)
    INTO v_total_amount, v_total_qty
    FROM public.purchase_order_lines
    WHERE purchase_id = v_purchase_id;
    
    UPDATE public.purchases
    SET total_amount = v_total_amount,
        total_qty = v_total_qty,
        updated_at = now()
    WHERE id = v_purchase_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_purchase_totals
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.calculate_purchase_totals();

-- =============================================
-- FUNCTION: Create stock movement on receiving
-- =============================================
CREATE OR REPLACE FUNCTION public.process_purchase_receiving()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    qty_diff INTEGER;
BEGIN
    -- Only process if qty_received changed
    IF OLD.qty_received IS DISTINCT FROM NEW.qty_received THEN
        qty_diff := NEW.qty_received - COALESCE(OLD.qty_received, 0);
        
        IF qty_diff > 0 THEN
            -- Create stock movement for incoming stock
            INSERT INTO public.stock_movements (
                variant_id,
                movement_type,
                qty,
                reference_type,
                reference_id,
                notes
            ) VALUES (
                NEW.variant_id,
                'IN',
                qty_diff,
                'purchase_order_line',
                NEW.id,
                'Purchase receiving'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_purchase_receiving
AFTER UPDATE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.process_purchase_receiving();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_imports;
