-- ========================================================
-- V2 JOURNAL MAPPING ARCHITECTURE (EVENT DRIVEN)
-- ========================================================

-- 1. Create the core mapping table
CREATE TABLE IF NOT EXISTS public.journal_account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- event identity
  event_type text NOT NULL,                 -- ex: confirm_sales_order
  event_context text NULL,                  -- ex: manual | marketplace | production

  -- side
  side text NOT NULL CHECK (side IN ('debit','credit')),

  -- account reference
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),

  -- condition
  product_type text NULL,                   -- production | purchased | null
  marketplace_code text NULL,               -- shopee | tokopedia | null

  -- control
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.journal_account_mappings ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Simple for now: Admin manages, System reads)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.journal_account_mappings;
CREATE POLICY "Enable read access for authenticated users" ON public.journal_account_mappings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable write access for service role" ON public.journal_account_mappings;
CREATE POLICY "Enable write access for service role" ON public.journal_account_mappings FOR ALL USING (auth.role() = 'service_role');


-- ========================================================
-- SEED V2 MAPPINGS (TRANSITION FROM V1)
-- ========================================================
DO $$
DECLARE
    -- Accounts (We look them up dynamically to be safe)
    acc_piutang_umum        UUID;
    acc_piutang_shopee      UUID;
    acc_piutang_tokopedia   UUID;
    acc_piutang_tiktok      UUID;
    acc_piutang_lazada      UUID;
    
    acc_rev_produksi        UUID; -- 4001
    acc_rev_shopee          UUID; -- 4101
    acc_rev_tokopedia       UUID; -- 4102
    acc_rev_tiktok          UUID; -- 4103
    acc_rev_lazada          UUID; -- 4104

    acc_kas                 UUID; -- 1001

    -- Cost / Expense
    acc_biaya_shopee        UUID;
    acc_biaya_tokopedia     UUID;
    acc_biaya_tiktok        UUID;
    acc_biaya_lazada        UUID;
    
BEGIN
    -- Lookup IDs
    SELECT id INTO acc_piutang_umum FROM chart_of_accounts WHERE code = '1101';
    SELECT id INTO acc_piutang_shopee FROM chart_of_accounts WHERE code = '1102';
    SELECT id INTO acc_piutang_tokopedia FROM chart_of_accounts WHERE code = '1103';
    SELECT id INTO acc_piutang_tiktok FROM chart_of_accounts WHERE code = '1104';
    SELECT id INTO acc_piutang_lazada FROM chart_of_accounts WHERE code = '1105';

    SELECT id INTO acc_rev_produksi FROM chart_of_accounts WHERE code = '4001';
    SELECT id INTO acc_rev_shopee FROM chart_of_accounts WHERE code = '4101';
    SELECT id INTO acc_rev_tokopedia FROM chart_of_accounts WHERE code = '4102';
    SELECT id INTO acc_rev_tiktok FROM chart_of_accounts WHERE code = '4103';
    SELECT id INTO acc_rev_lazada FROM chart_of_accounts WHERE code = '4104';

    SELECT id INTO acc_kas FROM chart_of_accounts WHERE code = '1001';

    SELECT id INTO acc_biaya_shopee FROM chart_of_accounts WHERE code = '6001';
    SELECT id INTO acc_biaya_tokopedia FROM chart_of_accounts WHERE code = '6002';
    SELECT id INTO acc_biaya_tiktok FROM chart_of_accounts WHERE code = '6003';
    SELECT id INTO acc_biaya_lazada FROM chart_of_accounts WHERE code = '6004';

    -- -------------------------------------------------------------
    -- 1. SALES ORDER (CONFIRM)
    -- -------------------------------------------------------------
    
    -- MANUAL / OFFLINE (Cash Basis usually, or Piutang Umum)
    -- Debit: KAS (Asumsi Sales Manual = Cash Keras)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('confirm_sales_order', 'manual', 'debit', acc_kas, 10);
    
    -- Credit: REVENUE (Produksi as Default)
    INSERT INTO journal_account_mappings (event_type, event_context, side, account_id, priority)
    VALUES ('confirm_sales_order', 'manual', 'credit', acc_rev_produksi, 10);


    -- MARKETPLACE: SHOPEE
    -- Debit: Piutang Shopee (1102)
    INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority)
    VALUES ('confirm_sales_order', 'marketplace', 'shopee', 'debit', acc_piutang_shopee, 20);
    
    -- Credit: Revenue Shopee (4101)
    INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority)
    VALUES ('confirm_sales_order', 'marketplace', 'shopee', 'credit', acc_rev_shopee, 20);

    -- Expense: Biaya Marketplace (Debit) - Optional? Usually handled in settlement?
    -- Assuming Auto-Journal Sales deducts fee immediately:
    -- Debit Expense (If logic supports querying 'expense' side for fees)
    -- For now, we map the CORE journal.


    -- MARKETPLACE: TOKOPEDIA
    INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority)
    VALUES 
    ('confirm_sales_order', 'marketplace', 'tokopedia', 'debit', acc_piutang_tokopedia, 20),
    ('confirm_sales_order', 'marketplace', 'tokopedia', 'credit', acc_rev_tokopedia, 20);

    -- MARKETPLACE: TIKTOK
    INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority)
    VALUES 
    ('confirm_sales_order', 'marketplace', 'tiktok', 'debit', acc_piutang_tiktok, 20),
    ('confirm_sales_order', 'marketplace', 'tiktok', 'credit', acc_rev_tiktok, 20);

    -- MARKETPLACE: LAZADA
    INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority)
    VALUES 
    ('confirm_sales_order', 'marketplace', 'lazada', 'debit', acc_piutang_lazada, 20),
    ('confirm_sales_order', 'marketplace', 'lazada', 'credit', acc_rev_lazada, 20);

    RAISE NOTICE 'V2 Mapping Table Created and Seeded.';
END $$;
