-- ========================================================
-- ADD GAIN/LOSS ACCOUNTS FOR STOCK OPNAME
-- ========================================================

-- 1. Add Gain from Stock Surplus account
INSERT INTO chart_of_accounts (code, name, account_type, is_active)
VALUES ('7-101', 'Keuntungan Selisih Stock', 'revenue', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Add Loss from Stock Shortage account
INSERT INTO chart_of_accounts (code, name, account_type, is_active)
VALUES ('6-101', 'Kerugian Selisih Stock', 'expense', true)
ON CONFLICT (code) DO NOTHING;

-- 3. Add AR Marketplace account
INSERT INTO chart_of_accounts (code, name, account_type, is_active)
VALUES ('1-106', 'Piutang Marketplace', 'asset', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Add Marketplace Fee Expense account
INSERT INTO chart_of_accounts (code, name, account_type, is_active)
VALUES ('6-102', 'Biaya Komisi Marketplace', 'expense', true)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE chart_of_accounts IS 
'Chart of Accounts - includes gain/loss accounts for stock opname and marketplace accounts';
