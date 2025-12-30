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
  // Account Mappings for Auto Journaling (Bank dikelola di tabel bank_accounts)
  ACCOUNT_KAS: 'account_kas',
  ACCOUNT_PERSEDIAAN: 'account_persediaan',
  ACCOUNT_HUTANG_SUPPLIER: 'account_hutang_supplier',
  ACCOUNT_PIUTANG_MARKETPLACE: 'account_piutang_marketplace',
  ACCOUNT_HPP: 'account_hpp',
  ACCOUNT_BIAYA_PENYESUAIAN_STOK: 'account_biaya_penyesuaian_stok',
  
  // Revenue accounts per marketplace
  ACCOUNT_PENJUALAN_SHOPEE: 'account_penjualan_shopee',
  ACCOUNT_PENJUALAN_TOKOPEDIA: 'account_penjualan_tokopedia',
  ACCOUNT_PENJUALAN_LAZADA: 'account_penjualan_lazada',
  ACCOUNT_PENJUALAN_TIKTOK: 'account_penjualan_tiktok',
  ACCOUNT_PENJUALAN_LAINNYA: 'account_penjualan_lainnya',
  
  // Admin fee accounts per marketplace
  ACCOUNT_BIAYA_ADMIN_SHOPEE: 'account_biaya_admin_shopee',
  ACCOUNT_BIAYA_ADMIN_TOKOPEDIA: 'account_biaya_admin_tokopedia',
  ACCOUNT_BIAYA_ADMIN_LAZADA: 'account_biaya_admin_lazada',
  ACCOUNT_BIAYA_ADMIN_TIKTOK: 'account_biaya_admin_tiktok',
  
  // General settings
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
