-- ========================================================
-- FIX: Add Missing Pricing Columns to Product Variants
-- These columns are required by the Audit Trigger and UI
-- ========================================================

ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS harga_jual_umum DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS harga_jual_khusus DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hpp DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN product_variants.harga_jual_umum IS 'General selling price (Reference)';
COMMENT ON COLUMN product_variants.harga_jual_khusus IS 'Special selling price (Reference)';
COMMENT ON COLUMN product_variants.hpp IS 'Cost of Goods Sold (Reference)';
