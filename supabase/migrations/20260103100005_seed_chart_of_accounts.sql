-- ========================================================
-- SEED CHART OF ACCOUNTS (ERP UMKM KONVEKSI)
-- ========================================================

-- Insert Accounts
INSERT INTO public.chart_of_accounts (code, name, account_type) VALUES
    -- 1. ASSET (1xxx)
    ('1001', 'Kas', 'asset'),
    ('1002', 'Bank BCA', 'asset'),
    ('1003', 'Bank Mandiri', 'asset'),
    ('1101', 'Piutang Usaha', 'asset'),
    ('1102', 'Piutang Marketplace – Shopee', 'asset'),
    ('1103', 'Piutang Marketplace – Tokopedia', 'asset'),
    ('1104', 'Piutang Marketplace – TikTok', 'asset'),
    ('1105', 'Piutang Marketplace – Lazada', 'asset'),
    ('1201', 'Persediaan Bahan Baku', 'asset'),
    ('1202', 'Persediaan Barang Dalam Proses (WIP)', 'asset'),
    ('1203', 'Persediaan Barang Jadi', 'asset'),
    ('1204', 'Persediaan Barang Beli Jadi', 'asset'),

    -- 2. LIABILITIES (2xxx)
    ('2001', 'Hutang Usaha', 'liability'),
    ('2002', 'Hutang Biaya Produksi', 'liability'),
    ('2003', 'Hutang Ongkir', 'liability'),
    ('2004', 'Hutang Pajak', 'liability'),

    -- 3. EQUITY (3xxx)
    ('3001', 'Modal Pemilik', 'equity'),
    ('3002', 'Laba Ditahan', 'equity'),
    ('3003', 'Laba Tahun Berjalan', 'equity'),

    -- 4. REVENUE (4xxx)
    ('4001', 'Penjualan Produk Produksi', 'revenue'),
    ('4002', 'Penjualan Produk Beli Jadi', 'revenue'),
    ('4101', 'Penjualan Marketplace – Shopee', 'revenue'),
    ('4102', 'Penjualan Marketplace – Tokopedia', 'revenue'),
    ('4103', 'Penjualan Marketplace – TikTok', 'revenue'),
    ('4104', 'Penjualan Marketplace – Lazada', 'revenue'),
    ('4201', 'Penjualan Manual / Offline', 'revenue'),

    -- 5. COGS / HPP (5xxx) - Mapped to 'expense' as standard enum
    ('5001', 'HPP Produksi', 'expense'),
    ('5002', 'HPP Barang Beli Jadi', 'expense'),
    ('5101', 'Biaya Bahan Baku', 'expense'),
    ('5102', 'Biaya Tenaga Kerja Produksi', 'expense'),
    ('5103', 'Biaya Overhead Produksi', 'expense'),

    -- 6. OPERATING EXPENSE (6xxx)
    ('6001', 'Biaya Admin Shopee', 'expense'),
    ('6002', 'Biaya Admin Tokopedia', 'expense'),
    ('6003', 'Biaya Admin TikTok', 'expense'),
    ('6004', 'Biaya Admin Lazada', 'expense'),
    ('6005', 'Biaya Iklan Marketplace', 'expense'),
    ('6006', 'Biaya Ongkir Ditanggung Penjual', 'expense'),
    ('6010', 'Diskon Penjualan', 'revenue'), -- Contra Revenue
    ('6011', 'Diskon Pembelian', 'expense'), -- Contra Expense (Credit)
    ('6101', 'Biaya Listrik & Air', 'expense'),
    ('6102', 'Biaya Sewa', 'expense'),
    ('6103', 'Biaya Internet', 'expense'),
    ('6104', 'Biaya ATK', 'expense'),
    ('6105', 'Biaya Maintenance', 'expense'),
    ('6106', 'Biaya Lain-lain', 'expense')

ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    account_type = EXCLUDED.account_type;

-- ========================================================
-- SEED DEFAULT APP SETTINGS (MAPPING)
-- ========================================================
DO $$
BEGIN -- <--- Added Syntax Fix (Main Block)
    
    -- 1. Ensure description column exists (Safe Alter)
    BEGIN
        ALTER TABLE public.app_settings ADD COLUMN description TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- 2. Upsert Settings
    INSERT INTO public.app_settings (setting_key, setting_value, description)
    SELECT m.key, c.id::text, m.descr
    FROM (VALUES 
        -- CASH & BANK
        ('account_kas', '1001', 'Kas'),

        -- RECEIVABLE
        ('account_piutang_usaha', '1101', 'Piutang Usaha'),
        ('account_piutang_marketplace_shopee', '1102', 'Piutang Marketplace Shopee'),
        ('account_piutang_marketplace_tokopedia', '1103', 'Piutang Marketplace Tokopedia'),
        ('account_piutang_marketplace_tiktok', '1104', 'Piutang Marketplace TikTok'),
        ('account_piutang_marketplace_lazada', '1105', 'Piutang Marketplace Lazada'),

        -- OLD KEYS (KEEP FOR COMPATIBILITY)
        ('account_piutang', '1101', 'Default Accounts Receivable (Legacy)'),
        ('account_persediaan', '1203', 'Default Inventory Asset (Legacy)'),
        ('account_penjualan', '4001', 'Default Sales Revenue (Legacy)'),
        ('account_retur_penjualan', '4001', 'Default Sales Return (Direct Reversal)'),
        ('account_hpp', '5001', 'Default COGS (Legacy)'),

        -- PAYABLE
        ('account_hutang_supplier', '2001', 'Hutang Usaha'),

        -- INVENTORY ASSET
        ('account_persediaan_bahan_baku', '1201', 'Persediaan Bahan Baku'),
        ('account_persediaan_wip', '1202', 'Persediaan WIP'),
        ('account_persediaan_barang_jadi', '1203', 'Persediaan Barang Jadi'),
        ('account_persediaan_barang_beli_jadi', '1204', 'Persediaan Barang Beli Jadi'),

        -- REVENUE
        ('account_penjualan_produksi', '4001', 'Penjualan Produk Produksi'),
        ('account_penjualan_beli_jadi', '4002', 'Penjualan Produk Beli Jadi'),
        ('account_penjualan_marketplace_shopee', '4101', 'Penjualan Marketplace Shopee'),
        ('account_penjualan_marketplace_tokopedia', '4102', 'Penjualan Marketplace Tokopedia'),
        ('account_penjualan_marketplace_tiktok', '4103', 'Penjualan Marketplace TikTok'),
        ('account_penjualan_marketplace_lazada', '4104', 'Penjualan Marketplace Lazada'),
        ('account_penjualan_manual', '4201', 'Penjualan Manual / Offline'),

        -- COGS / HPP
        ('account_hpp_produksi', '5001', 'HPP Produksi'),
        ('account_hpp_beli_jadi', '5002', 'HPP Barang Beli Jadi'),

        -- DISCOUNT & PROMO
        ('account_diskon_penjualan', '6010', 'Diskon Penjualan'),
        ('account_diskon_pembelian', '6011', 'Diskon Pembelian'),
        ('account_biaya_promo_marketplace', '6005', 'Biaya Promo Marketplace'),

        -- MARKETPLACE COST
        ('account_biaya_admin_shopee', '6001', 'Biaya Admin Shopee'),
        ('account_biaya_admin_tokopedia', '6002', 'Biaya Admin Tokopedia'),
        ('account_biaya_admin_tiktok', '6003', 'Biaya Admin TikTok'),
        ('account_biaya_admin_lazada', '6004', 'Biaya Admin Lazada'),
        ('account_biaya_ongkir_penjual', '6006', 'Biaya Ongkir Ditanggung Penjual'),

        -- PRODUCTION COST (V1 READY)
        ('account_biaya_tenaga_kerja_produksi', '5102', 'Biaya Tenaga Kerja Produksi'),
        ('account_biaya_overhead_produksi', '5103', 'Biaya Overhead Produksi'),

        -- ADJUSTMENT
        ('account_biaya_penyesuaian_stok', '6106', 'Biaya Penyesuaian Stok (Lain-lain)'),

        -- EQUITY
        ('account_modal_pemilik', '3001', 'Modal Pemilik'),
        ('account_laba_ditahan', '3002', 'Laba Ditahan')
    ) AS m(key, code, descr)
    JOIN public.chart_of_accounts c ON c.code = m.code
    ON CONFLICT (setting_key) DO UPDATE 
    SET setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_at = now();
        
    RAISE NOTICE 'App settings seeded successfully.';
END $$;
