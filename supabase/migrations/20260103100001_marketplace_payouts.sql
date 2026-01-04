-- ========================================================
-- MARKETPLACE PAYOUTS MODULE
-- ========================================================

-- 1. Create Payouts Table
CREATE TABLE IF NOT EXISTS public.marketplace_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_no text NOT NULL, -- e.g. PO-SHOPEE-20260101
    marketplace text NOT NULL, -- Shopee, Tokopedia, etc.
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric NOT NULL DEFAULT 0, -- Net Received
    total_orders integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Link Sales Orders to Payout
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.marketplace_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_payout_id ON public.sales_orders(payout_id);
CREATE INDEX IF NOT EXISTS idx_sales_marketplace_status ON public.sales_orders(marketplace, status) WHERE payout_id IS NULL;

-- 3. Enable RLS
ALTER TABLE public.marketplace_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.marketplace_payouts
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON public.marketplace_payouts
FOR ALL USING (auth.role() = 'authenticated');
