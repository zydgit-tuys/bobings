import { supabase } from "@/integrations/supabase/client";

export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

// Setting keys constants
export const SETTING_KEYS = {
  // CASH & BANK
  ACCOUNT_KAS: 'account_kas',

  // RECEIVABLE
  ACCOUNT_PIUTANG_USAHA: 'account_piutang_usaha',
  ACCOUNT_PIUTANG_MARKETPLACE_SHOPEE: 'account_piutang_marketplace_shopee',
  ACCOUNT_PIUTANG_MARKETPLACE_TOKOPEDIA: 'account_piutang_marketplace_tokopedia',
  ACCOUNT_PIUTANG_MARKETPLACE_TIKTOK: 'account_piutang_marketplace_tiktok',
  ACCOUNT_PIUTANG_MARKETPLACE_LAZADA: 'account_piutang_marketplace_lazada',

  // PAYABLE
  ACCOUNT_HUTANG_SUPPLIER: 'account_hutang_supplier',

  // INVENTORY ASSET
  ACCOUNT_PERSEDIAAN_BAHAN_BAKU: 'account_persediaan_bahan_baku',
  ACCOUNT_PERSEDIAAN_WIP: 'account_persediaan_wip',
  ACCOUNT_PERSEDIAAN_BARANG_JADI: 'account_persediaan_barang_jadi',
  ACCOUNT_PERSEDIAAN_BARANG_BELI_JADI: 'account_persediaan_barang_beli_jadi',

  // REVENUE
  ACCOUNT_PENJUALAN_PRODUK_PRODUKSI: 'account_penjualan_produksi',
  ACCOUNT_PENJUALAN_PRODUK_BELI_JADI: 'account_penjualan_beli_jadi',
  ACCOUNT_PENJUALAN_MARKETPLACE_SHOPEE: 'account_penjualan_marketplace_shopee',
  ACCOUNT_PENJUALAN_MARKETPLACE_TOKOPEDIA: 'account_penjualan_marketplace_tokopedia',
  ACCOUNT_PENJUALAN_MARKETPLACE_TIKTOK: 'account_penjualan_marketplace_tiktok',
  ACCOUNT_PENJUALAN_MARKETPLACE_LAZADA: 'account_penjualan_marketplace_lazada',
  ACCOUNT_PENJUALAN_MANUAL: 'account_penjualan_manual',

  // COGS / HPP
  ACCOUNT_HPP_PRODUKSI: 'account_hpp_produksi',
  ACCOUNT_HPP_BELI_JADI: 'account_hpp_beli_jadi',

  // DISCOUNT & PROMO
  ACCOUNT_DISKON_PENJUALAN: 'account_diskon_penjualan',
  ACCOUNT_DISKON_PEMBELIAN: 'account_diskon_pembelian',
  ACCOUNT_BIAYA_PROMO_MARKETPLACE: 'account_biaya_promo_marketplace',

  // MARKETPLACE COST
  ACCOUNT_BIAYA_ADMIN_SHOPEE: 'account_biaya_admin_shopee',
  ACCOUNT_BIAYA_ADMIN_TOKOPEDIA: 'account_biaya_admin_tokopedia',
  ACCOUNT_BIAYA_ADMIN_TIKTOK: 'account_biaya_admin_tiktok',
  ACCOUNT_BIAYA_ADMIN_LAZADA: 'account_biaya_admin_lazada',
  ACCOUNT_BIAYA_ONGKIR_PENJUAL: 'account_biaya_ongkir_penjual',

  // PRODUCTION COST
  ACCOUNT_BIAYA_TENAGA_KERJA_PRODUKSI: 'account_biaya_tenaga_kerja_produksi',
  ACCOUNT_BIAYA_OVERHEAD_PRODUKSI: 'account_biaya_overhead_produksi',

  // ADJUSTMENT
  ACCOUNT_BIAYA_PENYESUAIAN_STOK: 'account_biaya_penyesuaian_stok',

  // EQUITY
  ACCOUNT_MODAL_PEMILIK: 'account_modal_pemilik',
  ACCOUNT_LABA_DITAHAN: 'account_laba_ditahan',

  // LEGACY / FALLBACK (Keep for backward compatibility)
  ACCOUNT_PIUTANG: 'account_piutang',
  ACCOUNT_PERSEDIAAN: 'account_persediaan',
  ACCOUNT_PENJUALAN: 'account_penjualan',
  ACCOUNT_RETUR_PENJUALAN: 'account_retur_penjualan',
  ACCOUNT_HPP: 'account_hpp',
  ACCOUNT_BIAYA_ADMIN: 'account_biaya_admin',

  // General APP Settings
  ADMIN_PASSWORD: 'admin_password',
  DEFAULT_MIN_STOCK_ALERT: 'default_min_stock_alert',
  COMPANY_NAME: 'company_name',
} as const;

export async function getSettings(): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('setting_key');

  if (error) throw error;
  return data || [];
}

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();

  if (error) throw error;
  return data?.setting_value || null;
}

export async function upsertSetting(key: string, value: string): Promise<AppSetting> {
  // First check if setting exists
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .eq('setting_key', key)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('app_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('app_settings')
      .insert({ setting_key: key, setting_value: value })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function upsertSettings(settings: Record<string, string>): Promise<void> {
  const promises = Object.entries(settings).map(([key, value]) =>
    upsertSetting(key, value)
  );
  await Promise.all(promises);
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .delete()
    .eq('setting_key', key);

  if (error) throw error;
}
