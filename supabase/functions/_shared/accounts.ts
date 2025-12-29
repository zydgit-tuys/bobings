// ============================================
// CHART OF ACCOUNTS CONFIGURATION
// ============================================

// Account UUIDs for journal entries
export const ACCOUNTS = {
  // Assets (1xxx)
  KAS: 'acc00000-0000-0000-0000-000000000001', // 1110
  BANK_BCA: 'acc00000-0000-0000-0000-000000000002', // 1120
  PIUTANG_MARKETPLACE: 'acc00000-0000-0000-0000-000000000007', // 1210
  PERSEDIAAN: 'acc00000-0000-0000-0000-000000000009', // 1310
  
  // Liabilities (2xxx)
  HUTANG_SUPPLIER: 'acc00000-0000-0000-0000-000000000011', // 2110
  
  // Revenue (4xxx)
  PENJUALAN_SHOPEE: 'acc00000-0000-0000-0000-000000000018', // 4110
  PENJUALAN_TOKOPEDIA: 'acc00000-0000-0000-0000-000000000019', // 4120
  PENJUALAN_LAZADA: 'acc00000-0000-0000-0000-000000000020', // 4130
  PENJUALAN_TIKTOK: 'acc00000-0000-0000-0000-000000000021', // 4140
  PENJUALAN_LAINNYA: 'acc00000-0000-0000-0000-000000000022', // 4150
  
  // COGS (5xxx)
  HPP: 'acc00000-0000-0000-0000-000000000025', // 5110
  BIAYA_ADMIN_SHOPEE: 'acc00000-0000-0000-0000-000000000027', // 5210
  BIAYA_ADMIN_TOKOPEDIA: 'acc00000-0000-0000-0000-000000000028', // 5220
  BIAYA_ADMIN_LAZADA: 'acc00000-0000-0000-0000-000000000029', // 5230
  BIAYA_ADMIN_TIKTOK: 'acc00000-0000-0000-0000-000000000030', // 5240
} as const;

export function getRevenueAccount(marketplace: string): string {
  const mp = marketplace.toLowerCase();
  if (mp.includes('shopee')) return ACCOUNTS.PENJUALAN_SHOPEE;
  if (mp.includes('tokopedia') || mp.includes('tokped')) return ACCOUNTS.PENJUALAN_TOKOPEDIA;
  if (mp.includes('lazada')) return ACCOUNTS.PENJUALAN_LAZADA;
  if (mp.includes('tiktok') || mp.includes('tik tok')) return ACCOUNTS.PENJUALAN_TIKTOK;
  return ACCOUNTS.PENJUALAN_LAINNYA;
}

export function getAdminFeeAccount(marketplace: string): string {
  const mp = marketplace.toLowerCase();
  if (mp.includes('shopee')) return ACCOUNTS.BIAYA_ADMIN_SHOPEE;
  if (mp.includes('tokopedia') || mp.includes('tokped')) return ACCOUNTS.BIAYA_ADMIN_TOKOPEDIA;
  if (mp.includes('lazada')) return ACCOUNTS.BIAYA_ADMIN_LAZADA;
  if (mp.includes('tiktok') || mp.includes('tik tok')) return ACCOUNTS.BIAYA_ADMIN_TIKTOK;
  return ACCOUNTS.BIAYA_ADMIN_SHOPEE;
}
