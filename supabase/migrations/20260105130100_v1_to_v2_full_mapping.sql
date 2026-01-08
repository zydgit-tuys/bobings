-- Migration: Complete V1 to V2 Account Mapping
-- This migration creates journal_account_mappings entries based on existing app_settings
-- Run this AFTER the journal_account_mappings table has been created

-- ============================================================================
-- PURCHASE MODULE MAPPINGS
-- ============================================================================

-- 1. CONFIRM PURCHASE (Receive Goods)
-- Debit: Persediaan, Credit: Hutang Supplier
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_purchase',
    NULL,
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_purchase',
    NULL,
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_hutang_supplier' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. CONFIRM RETURN PURCHASE (Return Goods to Supplier)
-- Debit: Hutang Supplier, Credit: Persediaan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_return_purchase',
    NULL,
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_hutang_supplier' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_return_purchase',
    NULL,
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SALES MODULE MAPPINGS
-- ============================================================================

-- 3. CONFIRM SALES ORDER (Deliver Goods)
-- Debit: Piutang, Credit: Pendapatan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_sales_order',
    NULL,
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_piutang' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'confirm_sales_order',
    NULL,
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_pendapatan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. CREDIT NOTE (Sales Return)
-- Debit: Piutang (reversal), Credit: Pendapatan (reversal)
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'credit_note',
    NULL,
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_piutang' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'credit_note',
    NULL,
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_pendapatan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INVENTORY MODULE MAPPINGS
-- ============================================================================

-- 5. STOCK ADJUSTMENT - INCREASE (Add Stock)
-- Debit: Persediaan, Credit: Selisih Persediaan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_adjustment',
    'increase',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_adjustment',
    'increase',
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_selisih_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. STOCK ADJUSTMENT - DECREASE (Reduce Stock)
-- Debit: Selisih Persediaan, Credit: Persediaan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_adjustment',
    'decrease',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_selisih_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_adjustment',
    'decrease',
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. STOCK OPNAME - INCREASE (Surplus)
-- Debit: Persediaan, Credit: Selisih Persediaan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_opname',
    'increase',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_opname',
    'increase',
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_selisih_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 8. STOCK OPNAME - DECREASE (Shortage)
-- Debit: Selisih Persediaan, Credit: Persediaan
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_opname',
    'decrease',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_selisih_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'stock_opname',
    'decrease',
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_persediaan' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CUSTOMER PAYMENT MAPPINGS
-- ============================================================================

-- 9. CUSTOMER PAYMENT - CASH
-- Debit: Kas, Credit: Piutang
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'customer_payment',
    'cash',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_kas' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 10. CUSTOMER PAYMENT - BANK
-- Debit: Bank, Credit: Piutang
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'customer_payment',
    'bank',
    'debit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_bank' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- 11. CUSTOMER PAYMENT - CREDIT (Common for both cash and bank)
-- Debit: Kas/Bank, Credit: Piutang
INSERT INTO public.journal_account_mappings (event_type, event_context, side, account_id, priority, is_active)
SELECT 
    'customer_payment',
    NULL,
    'credit',
    setting_value::uuid,
    100,
    true
FROM public.app_settings
WHERE setting_key = 'account_piutang' AND setting_value IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check results
DO $$
DECLARE
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM public.journal_account_mappings WHERE priority = 100;
    RAISE NOTICE 'V1 to V2 Migration Complete. Created % mappings.', mapping_count;
END $$;
