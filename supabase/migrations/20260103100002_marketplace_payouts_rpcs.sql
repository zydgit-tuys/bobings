-- ========================================================
-- MARKETPLACE PAYOUTS RPCs
-- ========================================================

-- 1. Create Payout (Draft)
-- Aggegrates open orders into a payout draft.
CREATE OR REPLACE FUNCTION public.create_marketplace_payout(
    p_marketplace text,
    p_start_date date,
    p_end_date date
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout_id uuid;
    v_payout_no text;
    v_total_amount numeric;
    v_total_orders integer;
    v_net_receivable numeric;
BEGIN
    -- 1. Generate Payout No
    v_payout_no := 'PO-' || COALESCE(UPPER(p_marketplace), 'GEN') || '-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 1000)::text;

    -- 2. Calculate Totals from Eligible Orders
    -- Eligible: Status 'completed', Payout ID NULL, Matches Marketplace & Date
    -- Net Amount = total_amount (assuming total_amount is Gross Sales - Discount? Or Net Sales?)
    -- Usually: Payout = Gross Sales - Admin Fees.
    -- sales_orders has: total_amount (Net Received usually?) and total_fees.
    -- Let's assume total_amount INCLUDES fees deduction if it's Net?
    -- Based on 'auto-journal-sales':
    -- Net Receivable = total_amount - total_fees.
    -- So we sum (total_amount - total_fees).
    
    SELECT 
        COUNT(id),
        COALESCE(SUM(total_amount - COALESCE(total_fees, 0)), 0)
    INTO 
        v_total_orders,
        v_total_amount
    FROM public.sales_orders
    WHERE marketplace ILIKE p_marketplace
      AND status = 'completed'
      AND payout_id IS NULL
      AND order_date >= p_start_date
      AND order_date <= p_end_date;

    IF v_total_orders = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No eligible orders found');
    END IF;

    -- 3. Create Payout Record
    INSERT INTO public.marketplace_payouts (
        payout_no,
        marketplace,
        start_date,
        end_date,
        total_amount,
        total_orders,
        status
    ) VALUES (
        v_payout_no,
        p_marketplace,
        p_start_date,
        p_end_date,
        v_total_amount,
        v_total_orders,
        'draft'
    ) RETURNING id INTO v_payout_id;

    -- 4. Link Orders
    UPDATE public.sales_orders
    SET payout_id = v_payout_id,
        updated_at = now()
    WHERE marketplace ILIKE p_marketplace
      AND status = 'completed'
      AND payout_id IS NULL
      AND order_date >= p_start_date
      AND order_date <= p_end_date;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'total_orders', v_total_orders,
        'total_amount', v_total_amount
    );
END;
$$;

-- 2. Confirm Payout (Journaling)
CREATE OR REPLACE FUNCTION public.confirm_marketplace_payout(
    p_payout_id uuid,
    p_bank_account_id uuid
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout record;
    v_piutang_acc_id uuid;
    v_journal_id uuid;
    v_marketplace_code text;
BEGIN
    -- 1. Get Payout
    SELECT * INTO v_payout FROM public.marketplace_payouts WHERE id = p_payout_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payout not found');
    END IF;

    IF v_payout.status = 'confirmed' THEN
         RETURN jsonb_build_object('success', false, 'message', 'Payout already confirmed');
    END IF;

    -- 2. Determind Marketplace Code for Mapping
    IF v_payout.marketplace ILIKE '%shopee%' THEN v_marketplace_code := 'shopee';
    ELSIF v_payout.marketplace ILIKE '%tokopedia%' THEN v_marketplace_code := 'tokopedia';
    ELSIF v_payout.marketplace ILIKE '%tiktok%' THEN v_marketplace_code := 'tiktok';
    ELSIF v_payout.marketplace ILIKE '%lazada%' THEN v_marketplace_code := 'lazada';
    END IF;

    -- 3. Lookup Piutang Account (Debit side of Sales = Credit side of Payout)
    -- We look for the account that was debited during Sales.
    SELECT account_id INTO v_piutang_acc_id
    FROM public.journal_account_mappings
    WHERE event_type = 'confirm_sales_order'
      AND side = 'debit'
      AND marketplace_code = v_marketplace_code
    LIMIT 1;

    -- Fallback if no specific mapping
    IF v_piutang_acc_id IS NULL THEN
         SELECT setting_value::uuid INTO v_piutang_acc_id 
         FROM public.app_settings WHERE setting_key = 'account_piutang';
    END IF;

    IF v_piutang_acc_id IS NULL THEN
        RAISE EXCEPTION 'Piutang Account not found for marketplace %', v_payout.marketplace;
    END IF;

    -- 4. Create Journal Entry
    -- Dr Bank
    -- Cr Piutang
    INSERT INTO public.journal_entries (
        entry_date, reference_type, reference_id, description, total_debit, total_credit
    ) VALUES (
        now()::date, 'marketplace_payout', p_payout_id, 
        'Payout ' || v_payout.marketplace || ' ' || v_payout.payout_no,
        v_payout.total_amount, v_payout.total_amount
    ) RETURNING id INTO v_journal_id;

    -- Lines
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit)
    VALUES 
    (v_journal_id, p_bank_account_id, v_payout.total_amount, 0), -- Debit Bank
    (v_journal_id, v_piutang_acc_id, 0, v_payout.total_amount);  -- Credit Piutang

    -- 5. Update Status
    UPDATE public.marketplace_payouts
    SET status = 'confirmed', updated_at = now()
    WHERE id = p_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'journal_id', v_journal_id
    );
END;
$$;
