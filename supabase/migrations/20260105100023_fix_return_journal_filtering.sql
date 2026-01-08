-- ============================================
-- FIX PURCHASE RETURN JOURNAL FILTERING
-- ============================================

-- 1. Add journal_entry_id to purchase_returns for better tracking
ALTER TABLE public.purchase_returns 
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL;

-- 2. Retroactively fix existing journal entries for purchase returns
-- We change reference_id to the purchase_id (the anchor PO) 
-- so "Lihat Jurnal" from PO page can see them alongside receipts/payments.
DO $$
BEGIN
    -- Update journal_entries that point to purchase_returns
    -- Since reference_id is UUID, we can just compare directly with pr.id
    UPDATE public.journal_entries je
    SET reference_id = pr.purchase_id
    FROM public.purchase_returns pr
    WHERE je.reference_type = 'purchase_return' 
    AND (
        je.reference_id = pr.id  -- UUID to UUID comparison
    );

    RAISE NOTICE 'Retroactive journal updates for purchase returns completed.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not process some retroactive updates: %', SQLERRM;
END $$;
