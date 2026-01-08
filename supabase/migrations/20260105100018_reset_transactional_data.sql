-- ============================================
-- DEV TOOLS: Reset Transactional Data
-- ============================================
-- This function deletes all transactional data while preserving master data
-- Use ONLY in development/testing environments

CREATE OR REPLACE FUNCTION public.reset_transactional_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_journal_lines INTEGER := 0;
    v_deleted_journal_entries INTEGER := 0;
    v_deleted_order_items INTEGER := 0;
    v_deleted_sales_orders INTEGER := 0;
    v_deleted_sales_imports INTEGER := 0;
    v_deleted_purchase_return_lines INTEGER := 0;
    v_deleted_purchase_returns INTEGER := 0;
    v_deleted_purchase_order_lines INTEGER := 0;
    v_deleted_purchases INTEGER := 0;
    v_deleted_stock_movements INTEGER := 0;
    v_reset_variants INTEGER := 0;
BEGIN
    -- Delete in correct order to respect foreign key constraints
    
    -- 1. Delete journal lines (child of journal_entries)
    DELETE FROM public.journal_lines WHERE TRUE;
    GET DIAGNOSTICS v_deleted_journal_lines = ROW_COUNT;
    
    -- 2. Delete journal entries
    DELETE FROM public.journal_entries WHERE TRUE;
    GET DIAGNOSTICS v_deleted_journal_entries = ROW_COUNT;
    
    -- 3. Delete order items (child of sales_orders)
    DELETE FROM public.order_items WHERE TRUE;
    GET DIAGNOSTICS v_deleted_order_items = ROW_COUNT;

    -- 3.1 Delete sales return lines
    DELETE FROM public.sales_return_lines WHERE TRUE;

    -- 3.2 Delete sales returns
    DELETE FROM public.sales_returns WHERE TRUE;
    
    -- 4. Delete sales orders
    DELETE FROM public.sales_orders WHERE TRUE;
    GET DIAGNOSTICS v_deleted_sales_orders = ROW_COUNT;
    
    -- 5. Delete sales imports
    DELETE FROM public.sales_imports WHERE TRUE;
    GET DIAGNOSTICS v_deleted_sales_imports = ROW_COUNT;
    
    -- 6. Delete purchase return lines (child of purchase_returns)
    DELETE FROM public.purchase_return_lines WHERE TRUE;
    GET DIAGNOSTICS v_deleted_purchase_return_lines = ROW_COUNT;
    
    -- 7. Delete purchase returns
    DELETE FROM public.purchase_returns WHERE TRUE;
    GET DIAGNOSTICS v_deleted_purchase_returns = ROW_COUNT;

    -- 7.1 Delete purchase receipt lines
    DELETE FROM public.purchase_receipt_lines WHERE TRUE;

    -- 7.2 Delete purchase receipts
    DELETE FROM public.purchase_receipts WHERE TRUE;

    -- 7.3 Delete purchase payments
    DELETE FROM public.purchase_payments WHERE TRUE;
    
    -- 8. Delete purchase order lines (child of purchases)
    DELETE FROM public.purchase_order_lines WHERE TRUE;
    GET DIAGNOSTICS v_deleted_purchase_order_lines = ROW_COUNT;
    
    -- 9. Delete purchases
    DELETE FROM public.purchases WHERE TRUE;
    GET DIAGNOSTICS v_deleted_purchases = ROW_COUNT;
    
    -- 10. Delete stock movements
    DELETE FROM public.stock_movements WHERE TRUE;
    GET DIAGNOSTICS v_deleted_stock_movements = ROW_COUNT;
    
    -- 11. Reset stock quantities to initial_stock
    UPDATE public.product_variants
    SET stock_qty = 0,
        reserved_qty = 0,
        updated_at = now()
    WHERE TRUE;
    GET DIAGNOSTICS v_reset_variants = ROW_COUNT;
    
    -- Return summary
    RETURN jsonb_build_object(
        'success', true,
        'deleted', jsonb_build_object(
            'journal_lines', v_deleted_journal_lines,
            'journal_entries', v_deleted_journal_entries,
            'order_items', v_deleted_order_items,
            'sales_orders', v_deleted_sales_orders,
            'sales_imports', v_deleted_sales_imports,
            'purchase_return_lines', v_deleted_purchase_return_lines,
            'purchase_returns', v_deleted_purchase_returns,
            'purchase_order_lines', v_deleted_purchase_order_lines,
            'purchases', v_deleted_purchases,
            'stock_movements', v_deleted_stock_movements
        ),
        'reset_variants', v_reset_variants,
        'timestamp', now()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.reset_transactional_data() IS 
'DEV ONLY: Deletes all transactional data (sales, purchases, journals) and resets stock to initial values. Preserves master data.';
