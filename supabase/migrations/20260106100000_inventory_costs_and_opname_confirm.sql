-- ========================================================
-- INVENTORY COST VIEW + OPNAME CONFIRM RPC
-- ========================================================

-- 1. Inventory cost view based on ledger movements
CREATE OR REPLACE VIEW public.v_inventory_costs AS
WITH movement_costs AS (
    SELECT
        sm.variant_id,
        sm.created_at,
        sm.qty,
        sm.movement_type,
        CASE
            WHEN sm.reference_type = 'purchase_order_line' THEN (
                SELECT pol.unit_cost
                FROM public.purchase_order_lines pol
                WHERE pol.id = sm.reference_id
            )
            WHEN sm.reference_type = 'stock_opname' THEN (
                SELECT sol.unit_cost
                FROM public.stock_opname_lines sol
                WHERE sol.opname_id = sm.reference_id
                  AND sol.variant_id = sm.variant_id
                LIMIT 1
            )
            WHEN sm.reference_type = 'sales_order' THEN (
                SELECT oi.hpp
                FROM public.order_items oi
                WHERE oi.order_id = sm.reference_id
                  AND oi.variant_id = sm.variant_id
                LIMIT 1
            )
            WHEN sm.reference_type = 'sales_return' THEN (
                SELECT oi.hpp
                FROM public.sales_return_lines srl
                JOIN public.order_items oi ON srl.sales_order_line_id = oi.id
                WHERE srl.return_id = sm.reference_id
                  AND oi.variant_id = sm.variant_id
                LIMIT 1
            )
            WHEN sm.reference_type = 'purchase_return' THEN (
                SELECT pol.unit_cost
                FROM public.purchase_return_lines prl
                JOIN public.purchase_order_lines pol ON prl.purchase_line_id = pol.id
                WHERE prl.return_id = sm.reference_id
                  AND pol.variant_id = sm.variant_id
                LIMIT 1
            )
            ELSE NULL
        END AS unit_cost
    FROM public.stock_movements sm
)
SELECT
    pv.id AS variant_id,
    (
        SELECT mc.unit_cost
        FROM movement_costs mc
        WHERE mc.variant_id = pv.id
          AND mc.unit_cost IS NOT NULL
        ORDER BY mc.created_at DESC
        LIMIT 1
    ) AS last_unit_cost,
    (
        SELECT SUM(ABS(mc.qty) * mc.unit_cost) / NULLIF(SUM(ABS(mc.qty)), 0)
        FROM movement_costs mc
        WHERE mc.variant_id = pv.id
          AND mc.unit_cost IS NOT NULL
          AND mc.movement_type IN ('IN', 'RETURN', 'ADJUSTMENT')
    ) AS weighted_avg_cost,
    pv.stock_qty
FROM public.product_variants pv;

-- 2. RPC: get last unit cost (for adjustments/journaling)
CREATE OR REPLACE FUNCTION public.get_last_unit_cost(p_variant_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT mc.unit_cost
            FROM (
                SELECT
                    sm.created_at,
                    CASE
                        WHEN sm.reference_type = 'purchase_order_line' THEN (
                            SELECT pol.unit_cost
                            FROM public.purchase_order_lines pol
                            WHERE pol.id = sm.reference_id
                        )
                        WHEN sm.reference_type = 'stock_opname' THEN (
                            SELECT sol.unit_cost
                            FROM public.stock_opname_lines sol
                            WHERE sol.opname_id = sm.reference_id
                              AND sol.variant_id = sm.variant_id
                            LIMIT 1
                        )
                        WHEN sm.reference_type = 'sales_order' THEN (
                            SELECT oi.hpp
                            FROM public.order_items oi
                            WHERE oi.order_id = sm.reference_id
                              AND oi.variant_id = sm.variant_id
                            LIMIT 1
                        )
                        WHEN sm.reference_type = 'sales_return' THEN (
                            SELECT oi.hpp
                            FROM public.sales_return_lines srl
                            JOIN public.order_items oi ON srl.sales_order_line_id = oi.id
                            WHERE srl.return_id = sm.reference_id
                              AND oi.variant_id = sm.variant_id
                            LIMIT 1
                        )
                        WHEN sm.reference_type = 'purchase_return' THEN (
                            SELECT pol.unit_cost
                            FROM public.purchase_return_lines prl
                            JOIN public.purchase_order_lines pol ON prl.purchase_line_id = pol.id
                            WHERE prl.return_id = sm.reference_id
                              AND pol.variant_id = sm.variant_id
                            LIMIT 1
                        )
                        ELSE NULL
                    END AS unit_cost
                FROM public.stock_movements sm
                WHERE sm.variant_id = p_variant_id
            ) mc
            WHERE mc.unit_cost IS NOT NULL
            ORDER BY mc.created_at DESC
            LIMIT 1
        ),
        0
    );
$$;

-- 3. RPC: confirm stock opname (atomic: status + journal)
CREATE OR REPLACE FUNCTION public.confirm_stock_opname(p_opname_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_opname public.stock_opname%ROWTYPE;
    v_total_amount NUMERIC := 0;
    v_entry_id UUID;
    v_map_increase_debit UUID;
    v_map_increase_credit UUID;
    v_map_decrease_debit UUID;
    v_map_decrease_credit UUID;
    v_fallback_persediaan UUID;
    v_fallback_gain UUID;
    v_fallback_loss UUID;
BEGIN
    SELECT * INTO v_opname
    FROM public.stock_opname
    WHERE id = p_opname_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock opname not found';
    END IF;

    IF v_opname.status = 'confirmed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already confirmed');
    END IF;

    UPDATE public.stock_opname
    SET status = 'confirmed',
        confirmed_at = NOW(),
        confirmed_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_opname_id;

    SELECT account_id INTO v_map_increase_debit
    FROM public.journal_account_mappings
    WHERE event_type = 'stock_opname'
      AND side = 'debit'
      AND is_active = true
      AND (event_context = 'increase' OR event_context IS NULL)
    ORDER BY priority DESC
    LIMIT 1;

    SELECT account_id INTO v_map_increase_credit
    FROM public.journal_account_mappings
    WHERE event_type = 'stock_opname'
      AND side = 'credit'
      AND is_active = true
      AND (event_context = 'increase' OR event_context IS NULL)
    ORDER BY priority DESC
    LIMIT 1;

    SELECT account_id INTO v_map_decrease_debit
    FROM public.journal_account_mappings
    WHERE event_type = 'stock_opname'
      AND side = 'debit'
      AND is_active = true
      AND (event_context = 'decrease' OR event_context IS NULL)
    ORDER BY priority DESC
    LIMIT 1;

    SELECT account_id INTO v_map_decrease_credit
    FROM public.journal_account_mappings
    WHERE event_type = 'stock_opname'
      AND side = 'credit'
      AND is_active = true
      AND (event_context = 'decrease' OR event_context IS NULL)
    ORDER BY priority DESC
    LIMIT 1;

    SELECT setting_value::UUID INTO v_fallback_persediaan
    FROM public.app_settings
    WHERE setting_key = 'account_persediaan';

    SELECT id INTO v_fallback_gain
    FROM public.chart_of_accounts
    WHERE code = '7-101';

    SELECT id INTO v_fallback_loss
    FROM public.chart_of_accounts
    WHERE code = '6-101';

    v_map_increase_debit := COALESCE(v_map_increase_debit, v_fallback_persediaan);
    v_map_increase_credit := COALESCE(v_map_increase_credit, v_fallback_gain);
    v_map_decrease_debit := COALESCE(v_map_decrease_debit, v_fallback_loss);
    v_map_decrease_credit := COALESCE(v_map_decrease_credit, v_fallback_persediaan);

    IF v_map_increase_debit IS NULL
        OR v_map_increase_credit IS NULL
        OR v_map_decrease_debit IS NULL
        OR v_map_decrease_credit IS NULL THEN
        RAISE EXCEPTION 'Required Accounts (Persediaan, Gain, Loss) not configured';
    END IF;

    SELECT COALESCE(SUM(ABS(physical_qty - system_qty) * unit_cost), 0)
    INTO v_total_amount
    FROM public.stock_opname_lines
    WHERE opname_id = p_opname_id
      AND physical_qty <> system_qty;

    IF v_total_amount = 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'No differences to journal');
    END IF;

    INSERT INTO public.journal_entries (
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit
    ) VALUES (
        v_opname.opname_date,
        'Stock Opname - ' || v_opname.opname_no,
        'stock_opname',
        v_opname.id,
        v_total_amount,
        v_total_amount
    ) RETURNING id INTO v_entry_id;

    WITH diff_lines AS (
        SELECT
            variant_id,
            (physical_qty - system_qty) AS diff_qty,
            ABS(physical_qty - system_qty) * unit_cost AS amount
        FROM public.stock_opname_lines
        WHERE opname_id = p_opname_id
          AND physical_qty <> system_qty
    ),
    journal_rows AS (
        SELECT
            v_entry_id AS entry_id,
            CASE WHEN diff_qty > 0 THEN v_map_increase_debit ELSE v_map_decrease_debit END AS account_id,
            CASE WHEN diff_qty > 0 THEN amount ELSE 0 END AS debit,
            CASE WHEN diff_qty > 0 THEN 0 ELSE amount END AS credit,
            CASE WHEN diff_qty > 0 THEN 'Surplus - ' || variant_id::text ELSE 'Kerugian Selisih Stock' END AS description
        FROM diff_lines
        UNION ALL
        SELECT
            v_entry_id AS entry_id,
            CASE WHEN diff_qty > 0 THEN v_map_increase_credit ELSE v_map_decrease_credit END AS account_id,
            CASE WHEN diff_qty > 0 THEN 0 ELSE amount END AS debit,
            CASE WHEN diff_qty > 0 THEN amount ELSE 0 END AS credit,
            CASE WHEN diff_qty > 0 THEN 'Keuntungan Selisih Stock' ELSE 'Shortage - ' || variant_id::text END AS description
        FROM diff_lines
    )
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit, description)
    SELECT entry_id, account_id, debit, credit, description
    FROM journal_rows;

    RETURN jsonb_build_object('success', true, 'journal_entry_id', v_entry_id);
END;
$$;
