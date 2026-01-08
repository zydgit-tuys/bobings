-- Migration: Cleanup V1 Account Mappings from app_settings
-- This migration removes old V1 account mapping settings after successful V2 migration
-- Run this AFTER confirming V2 mappings are working correctly

-- ============================================================================
-- SAFETY CHECK: Verify V2 mappings exist before deleting V1
-- ============================================================================
DO $$
DECLARE
    v2_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v2_count FROM public.journal_account_mappings WHERE priority = 100;
    
    IF v2_count < 10 THEN
        RAISE EXCEPTION 'V2 mappings not found or incomplete (found % mappings). Please run V1→V2 migration first.', v2_count;
    END IF;
    
    RAISE NOTICE 'V2 mappings verified (% entries). Proceeding with V1 cleanup...', v2_count;
END $$;

-- ============================================================================
-- DELETE V1 ACCOUNT MAPPING SETTINGS
-- ============================================================================

-- Delete all account mapping settings from V1
DELETE FROM public.app_settings
WHERE setting_key IN (
    'account_persediaan',
    'account_hutang_supplier',
    'account_piutang',
    'account_pendapatan',
    'account_selisih_persediaan',
    'account_kas',
    'account_bank'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    remaining_v1 INTEGER;
    v2_total INTEGER;
BEGIN
    -- Check if any V1 settings remain
    SELECT COUNT(*) INTO remaining_v1 
    FROM public.app_settings 
    WHERE setting_key LIKE 'account_%';
    
    -- Count V2 mappings
    SELECT COUNT(*) INTO v2_total 
    FROM public.journal_account_mappings;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'V1 Cleanup Complete!';
    RAISE NOTICE 'Remaining V1 account settings: %', remaining_v1;
    RAISE NOTICE 'Total V2 mappings: %', v2_total;
    RAISE NOTICE '===========================================';
    
    IF remaining_v1 > 0 THEN
        RAISE NOTICE 'Note: Some account settings remain (likely non-mapping settings)';
    END IF;
END $$;
