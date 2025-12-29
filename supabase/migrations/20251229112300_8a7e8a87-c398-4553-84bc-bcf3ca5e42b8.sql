
-- =============================================
-- DATABASE FUNCTIONS & TRIGGERS
-- =============================================

-- 1. Auto-update stock_qty when stock_movement is created
CREATE OR REPLACE FUNCTION public.update_variant_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.movement_type IN ('IN', 'RETURN') THEN
        UPDATE public.product_variants 
        SET stock_qty = stock_qty + NEW.qty,
            updated_at = now()
        WHERE id = NEW.variant_id;
    ELSIF NEW.movement_type IN ('OUT', 'SALE') THEN
        UPDATE public.product_variants 
        SET stock_qty = stock_qty - NEW.qty,
            updated_at = now()
        WHERE id = NEW.variant_id;
    ELSIF NEW.movement_type = 'ADJUSTMENT' THEN
        -- For adjustment, qty can be positive or negative
        UPDATE public.product_variants 
        SET stock_qty = stock_qty + NEW.qty,
            updated_at = now()
        WHERE id = NEW.variant_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_variant_stock();

-- 2. Validate journal entry balance (debit = credit)
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_d DECIMAL(15,2);
    total_c DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO total_d, total_c
    FROM public.journal_lines
    WHERE entry_id = NEW.entry_id;
    
    UPDATE public.journal_entries
    SET total_debit = total_d,
        total_credit = total_c
    WHERE id = NEW.entry_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_journal_totals
AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW
EXECUTE FUNCTION public.validate_journal_balance();

-- 3. Check duplicate order function
CREATE OR REPLACE FUNCTION public.check_duplicate_order(p_desty_order_no TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sales_orders 
        WHERE desty_order_no = p_desty_order_no
    );
$$;

-- 4. Get inventory alerts (products below min stock)
CREATE OR REPLACE FUNCTION public.get_inventory_alerts()
RETURNS TABLE (
    variant_id UUID,
    sku_variant TEXT,
    product_name TEXT,
    current_stock INTEGER,
    min_stock INTEGER,
    size_name TEXT,
    color_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        pv.id as variant_id,
        pv.sku_variant,
        p.name as product_name,
        pv.stock_qty as current_stock,
        pv.min_stock_alert as min_stock,
        sv.value as size_name,
        cv.value as color_name
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    LEFT JOIN public.attribute_values sv ON sv.id = pv.size_value_id
    LEFT JOIN public.attribute_values cv ON cv.id = pv.color_value_id
    WHERE pv.stock_qty <= pv.min_stock_alert
    AND pv.is_active = true
    ORDER BY pv.stock_qty ASC;
$$;

-- 5. Get trial balance for accounting
CREATE OR REPLACE FUNCTION public.get_trial_balance(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_type public.account_type,
    total_debit DECIMAL(15,2),
    total_credit DECIMAL(15,2),
    balance DECIMAL(15,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        coa.id as account_id,
        coa.code as account_code,
        coa.name as account_name,
        coa.account_type,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit,
        COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN public.journal_entries je ON je.id = jl.entry_id
        AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
        AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    WHERE coa.is_active = true
    GROUP BY coa.id, coa.code, coa.name, coa.account_type
    ORDER BY coa.code;
$$;

-- 6. Calculate order profit
CREATE OR REPLACE FUNCTION public.calculate_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_amount DECIMAL(15,2);
    v_total_hpp DECIMAL(15,2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(hpp * qty), 0)
    INTO v_total_amount, v_total_hpp
    FROM public.order_items
    WHERE order_id = NEW.order_id;
    
    UPDATE public.sales_orders
    SET total_amount = v_total_amount,
        total_hpp = v_total_hpp,
        profit = v_total_amount - v_total_hpp - total_fees,
        updated_at = now()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_order_totals();

-- 7. Auto update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_imports_updated_at BEFORE UPDATE ON public.sales_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
