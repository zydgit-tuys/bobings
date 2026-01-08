-- ============================================================================
-- COMPREHENSIVE DATABASE AUDIT QUERIES
-- Run these queries in Supabase Dashboard SQL Editor to audit your database
-- ============================================================================

-- ============================================================================
-- SECTION 1: SCHEMA OVERVIEW
-- ============================================================================

-- 1.1 List all tables with row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1.2 List all columns with data types
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- SECTION 2: FOREIGN KEYS & INDEXES
-- ============================================================================

-- 2.1 List all foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 2.2 Find foreign keys WITHOUT indexes (performance issue)
SELECT
    tc.table_name,
    kcu.column_name,
    'Missing index on FK' AS issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = tc.table_name
        AND indexdef LIKE '%' || kcu.column_name || '%'
    )
ORDER BY tc.table_name;

-- 2.3 List all indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 3: FUNCTIONS & TRIGGERS
-- ============================================================================

-- 3.1 List all functions
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 3.2 List all triggers
SELECT
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 3.3 Find tables WITHOUT updated_at trigger
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (
        SELECT DISTINCT event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND trigger_name LIKE '%updated_at%'
    )
ORDER BY table_name;

-- ============================================================================
-- SECTION 4: RLS POLICIES
-- ============================================================================

-- 4.1 List all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4.2 Find tables WITHOUT RLS enabled
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = false
ORDER BY tablename;

-- 4.3 Find tables WITH RLS but NO policies
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND NOT EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    )
ORDER BY t.tablename;

-- ============================================================================
-- SECTION 5: DATA INTEGRITY CHECKS
-- ============================================================================

-- 5.1 Find orphaned purchase_order_lines (no parent purchase)
SELECT 'purchase_order_lines' AS table_name, COUNT(*) AS orphaned_count
FROM purchase_order_lines pol
WHERE NOT EXISTS (
    SELECT 1 FROM purchases p WHERE p.id = pol.purchase_id
);

-- 5.2 Find orphaned sales_order_lines (no parent sales_order)
SELECT 'sales_order_lines' AS table_name, COUNT(*) AS orphaned_count
FROM sales_order_lines sol
WHERE NOT EXISTS (
    SELECT 1 FROM sales_orders so WHERE so.id = sol.sales_order_id
);

-- 5.3 Find orphaned journal_lines (no parent journal_entry)
SELECT 'journal_lines' AS table_name, COUNT(*) AS orphaned_count
FROM journal_lines jl
WHERE NOT EXISTS (
    SELECT 1 FROM journal_entries je WHERE je.id = jl.entry_id
);

-- 5.4 Find journal entries with unbalanced debit/credit
SELECT
    je.id,
    je.entry_date,
    je.description,
    je.total_debit,
    je.total_credit,
    ABS(je.total_debit - je.total_credit) AS imbalance
FROM journal_entries je
WHERE ABS(je.total_debit - je.total_credit) > 0.01
ORDER BY imbalance DESC;

-- 5.5 Find products with negative stock
SELECT
    p.id,
    p.name,
    pv.sku,
    pv.stock_qty,
    pv.warehouse_id
FROM products p
JOIN product_variants pv ON p.id = pv.product_id
WHERE pv.stock_qty < 0
ORDER BY pv.stock_qty;

-- ============================================================================
-- SECTION 6: UNUSED OR REDUNDANT DATA
-- ============================================================================

-- 6.1 Find unused chart of accounts (no journal lines)
SELECT
    coa.code,
    coa.name,
    coa.account_type
FROM chart_of_accounts coa
WHERE NOT EXISTS (
    SELECT 1
    FROM journal_lines jl
    WHERE jl.account_id = coa.id
)
ORDER BY coa.code;

-- 6.2 Find inactive suppliers with no purchases
SELECT
    s.id,
    s.name,
    s.is_active
FROM suppliers s
WHERE s.is_active = false
    AND NOT EXISTS (
        SELECT 1
        FROM purchases p
        WHERE p.supplier_id = s.id
    );

-- 6.3 Find inactive customers with no sales
SELECT
    c.id,
    c.name,
    c.is_active
FROM customers c
WHERE c.is_active = false
    AND NOT EXISTS (
        SELECT 1
        FROM sales_orders so
        WHERE so.customer_id = c.id
    );

-- ============================================================================
-- SECTION 7: PERFORMANCE CHECKS
-- ============================================================================

-- 7.1 Find tables with most rows (potential performance issues)
SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 20;

-- 7.2 Find tables with most updates (high churn)
SELECT
    schemaname,
    tablename,
    n_tup_upd AS update_count,
    n_tup_del AS delete_count,
    n_live_tup AS live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd DESC
LIMIT 20;

-- ============================================================================
-- SECTION 8: SECURITY AUDIT
-- ============================================================================

-- 8.1 Find columns that might contain sensitive data without encryption
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (
        column_name LIKE '%password%'
        OR column_name LIKE '%secret%'
        OR column_name LIKE '%token%'
        OR column_name LIKE '%key%'
    )
ORDER BY table_name, column_name;

-- 8.2 Find tables accessible by anon role (potential security issue)
SELECT
    schemaname,
    tablename,
    policyname,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND 'anon' = ANY(roles)
ORDER BY tablename;

-- ============================================================================
-- SECTION 9: V2 MAPPING AUDIT
-- ============================================================================

-- 9.1 List all V2 account mappings
SELECT
    event_type,
    event_context,
    side,
    marketplace_code,
    priority,
    is_active,
    (SELECT code || ' - ' || name FROM chart_of_accounts WHERE id = account_id) AS account
FROM journal_account_mappings
ORDER BY event_type, priority DESC, side;

-- 9.2 Find event types without mappings
SELECT DISTINCT event_type
FROM (
    VALUES 
        ('confirm_purchase'),
        ('confirm_return_purchase'),
        ('confirm_sales_order'),
        ('credit_note'),
        ('stock_adjustment'),
        ('stock_opname'),
        ('customer_payment')
) AS expected(event_type)
WHERE NOT EXISTS (
    SELECT 1
    FROM journal_account_mappings jam
    WHERE jam.event_type = expected.event_type
);

-- 9.3 Find incomplete mappings (missing debit or credit)
SELECT
    event_type,
    event_context,
    CASE WHEN debit_count = 0 THEN 'Missing DEBIT' ELSE '' END ||
    CASE WHEN credit_count = 0 THEN 'Missing CREDIT' ELSE '' END AS issue
FROM (
    SELECT
        event_type,
        event_context,
        SUM(CASE WHEN side = 'debit' THEN 1 ELSE 0 END) AS debit_count,
        SUM(CASE WHEN side = 'credit' THEN 1 ELSE 0 END) AS credit_count
    FROM journal_account_mappings
    WHERE is_active = true
    GROUP BY event_type, event_context
) AS mapping_check
WHERE debit_count = 0 OR credit_count = 0;

-- ============================================================================
-- END OF AUDIT QUERIES
-- ============================================================================
