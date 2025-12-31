
-- Insert Standard Chart of Accounts
-- Uses ON CONFLICT DO NOTHING to avoid duplicates if run multiple times

INSERT INTO public.chart_of_accounts (code, name, account_type, is_active) VALUES
-- ASSETS (1000-1999)
('1001', 'Kas Kecil', 'asset', true),
('1002', 'Bank BCA', 'asset', true),
('1003', 'Bank Mandiri', 'asset', true),
('1010', 'Piutang Usaha', 'asset', true),
('1020', 'Persediaan Barang', 'asset', true),
('1030', 'Perlengkapan', 'asset', true),

-- LIABILITIES (2000-2999)
('2001', 'Hutang Usaha (Supplier)', 'liability', true),
('2002', 'Hutang Gaji', 'liability', true),
('2100', 'Hutang Bank Jangka Panjang', 'liability', true),

-- EQUITY (3000-3999)
('3001', 'Modal Disetor', 'equity', true),
('3002', 'Laba Ditahan', 'equity', true),
('3003', 'Saldo Awal', 'equity', true),

-- REVENUE (4000-4999)
('4001', 'Penjualan', 'revenue', true),
('4002', 'Pendapatan Lain-lain', 'revenue', true),

-- EXPENSES (5000-5999) (COGS/HPP)
('5001', 'Harga Pokok Penjualan (HPP)', 'expense', true),
('5002', 'Biaya Penyesuaian Stok', 'expense', true), -- Crucial for Stock Adjustments

-- OPERATIONAL EXPENSES (6000-6999)
('6001', 'Biaya Gaji', 'expense', true),
('6002', 'Biaya Sewa', 'expense', true),
('6003', 'Biaya Listrik & Air', 'expense', true),
('6004', 'Biaya Operasional Lainnya', 'expense', true)

ON CONFLICT (code) DO NOTHING;

-- Verification
SELECT * FROM chart_of_accounts ORDER BY code;
