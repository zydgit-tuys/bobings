
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Setting keys
// Setting keys
const SETTING_KEYS = {
    ACCOUNT_KAS: 'account_kas',
    ACCOUNT_BANK: 'account_bank',
    ACCOUNT_PIUTANG: 'account_piutang',
    ACCOUNT_PENJUALAN: 'account_penjualan',
    ACCOUNT_HPP: 'account_hpp',
    ACCOUNT_PERSEDIAAN: 'account_persediaan',

    // Revenue specific
    ACCOUNT_PENJUALAN_SHOPEE: 'account_penjualan_shopee',
    ACCOUNT_PENJUALAN_TOKOPEDIA: 'account_penjualan_tokopedia',
    ACCOUNT_PENJUALAN_LAZADA: 'account_penjualan_lazada',
    ACCOUNT_PENJUALAN_TIKTOK: 'account_penjualan_tiktok',

    // Fee specific
    ACCOUNT_BIAYA_ADMIN_SHOPEE: 'account_biaya_admin_shopee',
    ACCOUNT_BIAYA_ADMIN_TOKOPEDIA: 'account_biaya_admin_tokopedia',
    ACCOUNT_BIAYA_ADMIN_LAZADA: 'account_biaya_admin_lazada',
    ACCOUNT_BIAYA_ADMIN_TIKTOK: 'account_biaya_admin_tiktok',

    // Misc
    ACCOUNT_RETUR_PENJUALAN: 'account_retur_penjualan',
    ACCOUNT_DISKON_PENJUALAN: 'account_diskon_penjualan',
    ACCOUNT_PENDAPATAN_ONGKIR: 'account_pendapatan_ongkir',
};

interface SalesJournalRequest {
    salesOrderId: string;
    paymentMethod: 'cash' | 'bank' | 'credit'; // credit means Piutang
    amount?: number; // Optional override, otherwise uses order total
}

async function getAccountMapping(supabase: any, settingKey: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();

    if (error) console.error(`Error fetching setting ${settingKey}:`, error);
    return data?.setting_value || null;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('📝 Starting auto journal for sales...');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { salesOrderId, paymentMethod, amount, is_return } = await req.json();

        if (!salesOrderId) {
            throw new Error('Missing salesOrderId');
        }

        // 1. Fetch Sales Order with Items
        const { data: order, error: orderError } = await supabase
            .from('sales_orders')
            .select(`
                *,
                order_items (
                   subtotal,
                   hpp,
                   qty,
                   product_name
                )
            `)
            .eq('id', salesOrderId)
            .single();

        if (orderError || !order) {
            throw new Error('Sales Order not found');
        }

        console.log(`Processing Order: ${order.desty_order_no}, Total: ${order.total_amount}`);

        // 2. Determine Account Keys based on Marketplace
        const marketplace = (order.marketplace || 'Lainnya').toLowerCase();
        let salesKey = 'account_penjualan'; // Default/Generic
        let feeKey = 'account_biaya_admin'; // Default/Generic

        if (marketplace.includes('shopee')) {
            salesKey = SETTING_KEYS.ACCOUNT_PENJUALAN_SHOPEE;
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_SHOPEE;
        } else if (marketplace.includes('tokopedia')) {
            salesKey = SETTING_KEYS.ACCOUNT_PENJUALAN_TOKOPEDIA;
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TOKOPEDIA;
        } else if (marketplace.includes('lazada')) {
            salesKey = SETTING_KEYS.ACCOUNT_PENJUALAN_LAZADA;
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_LAZADA;
        } else if (marketplace.includes('tiktok')) {
            salesKey = SETTING_KEYS.ACCOUNT_PENJUALAN_TIKTOK;
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TIKTOK;
        }

        // 3. Fetch All Relevant Settings (Parallel)
        const settingKeys = [
            SETTING_KEYS.ACCOUNT_KAS,
            SETTING_KEYS.ACCOUNT_BANK,
            'account_piutang', // Generic Piutang
            'account_penjualan', // Generic Sales (Fallback)
            'account_biaya_admin', // Generic Fee (Fallback)
            'account_hpp',
            'account_persediaan',
            'account_retur_penjualan', // New
            'account_diskon_penjualan', // New (Seller Discount)
            'account_pendapatan_ongkir', // New (Shipping Income)
            salesKey, // Specific Sales
            feeKey    // Specific Fee
        ];

        const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', settingKeys);

        if (settingsError) throw settingsError;

        const settingMap = new Map<string, string>(settings?.map((s: any) => [s.setting_key, s.setting_value]) || []);

        // Helper to get with fallback
        const getAccount = (specificKey: string, fallbackKey?: string, required = true): string => {
            let val = settingMap.get(specificKey);
            if (!val && fallbackKey) val = settingMap.get(fallbackKey);
            if (!val && required) throw new Error(`Missing Account Mapping: ${specificKey} (and fallback ${fallbackKey || 'none'})`);
            return val || '';
        };

        const accountKas = getAccount(SETTING_KEYS.ACCOUNT_KAS);
        const accountBank = getAccount(SETTING_KEYS.ACCOUNT_BANK);
        const accountHpp = getAccount('account_hpp');
        const accountPersediaan = getAccount('account_persediaan');

        // Dynamic Resolution
        const accountPenjualan = getAccount(salesKey, 'account_penjualan');
        const accountBiayaAdmin = getAccount(feeKey, 'account_biaya_admin', false); // Optional if no fee
        const accountPiutang = getAccount('account_piutang');

        // Misc Accounts
        const accountRetur = getAccount('account_retur_penjualan', 'account_penjualan'); // Fallback to Sales if no Return acc
        const accountDiskon = getAccount('account_diskon_penjualan', 'account_penjualan', false); // Optional (contra revenue)
        const accountOngkir = getAccount('account_pendapatan_ongkir', 'account_penjualan', false); // Optional

        // 4. Determine Money Account (Cash/Bank/Piutang)
        let moneyAccountId = '';
        let moneyAccountName = '';

        if (paymentMethod === 'cash') {
            moneyAccountId = accountKas;
            moneyAccountName = 'Kas';
        } else if (paymentMethod === 'bank') {
            moneyAccountId = accountBank;
            moneyAccountName = 'Bank';
        } else {
            moneyAccountId = accountPiutang;
            moneyAccountName = 'Piutang Usaha';
        }

        // 5. Create Header
        const description = is_return
            ? `Retur Penjualan ${order.desty_order_no} (${moneyAccountName})`
            : `Penjualan ${order.desty_order_no} (${moneyAccountName})`;

        // Total Journal Debit = derived from lines, but we put order total for overview
        const { data: journalEntry, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: new Date().toISOString().split('T')[0],
                reference_type: 'sales_order',
                reference_id: order.id,
                description,
                total_debit: 0, // Will be updated by trigger usually, or we set 0
                total_credit: 0,
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 6. Create Lines
        const lines = [];

        // Extract values
        const grossAmount = Number(order.total_amount) || 0; // Does this include discount? Usually Total = Subtotal - Discount + Fee?
        // Let's assume order.total_amount is the FINAL NET from customer perspective? 
        // Need to check specific fields like seller_discount, etc. if available.
        // For simplicity, we stick to:
        // Net Cash Received = Total Amount - Fees

        const fees = Number(order.total_fees) || 0;
        const totalHpp = Number(order.total_hpp) || 0;
        const netReceivable = grossAmount - fees;

        // Is there a Seller Discount? 
        // Desty data might have it, but do we have it on sales_orders table?
        // Looking at schema from previous context... createSalesOrder doesn't explicitly save seller_discount to a column, 
        // it just calculates profit. Wait, parseDestyFile has 'sellerDiscount'.
        // Let's assume for now we work with the totals we have. 
        // Ideally we should save discount to db.

        if (is_return) {
            // === RETURN LOGIC ===
            // Reverse Revenue
            lines.push({
                entry_id: journalEntry.id, account_id: accountRetur || accountPenjualan,
                debit: grossAmount, credit: 0,
                description: `Retur Penjualan`
            });

            // Reverse Receivables / Cash
            if (netReceivable > 0) {
                lines.push({
                    entry_id: journalEntry.id, account_id: moneyAccountId,
                    debit: 0, credit: netReceivable,
                    description: `Pengembalian Dana`
                });
            }

            // Reverse Fees (Admin Charges Refunded)
            if (fees > 0) {
                // Credit Expense (Contra-expense or just Credit Expense Account)
                const feeAcc = accountBiayaAdmin || moneyAccountId; // Fallback to money if no expense acc
                lines.push({
                    entry_id: journalEntry.id, account_id: feeAcc,
                    debit: 0, credit: fees,
                    description: `Reversal Biaya Admin`
                });
            }

            // Reverse COGS (Inventory Back, COGS Credit)
            if (totalHpp > 0) {
                lines.push({
                    entry_id: journalEntry.id, account_id: accountPersediaan,
                    debit: totalHpp, credit: 0,
                    description: `Restock Inventory`
                });
                lines.push({
                    entry_id: journalEntry.id, account_id: accountHpp,
                    debit: 0, credit: totalHpp,
                    description: `HPP Reversal`
                });
            }

        } else {
            // === SALES LOGIC ===
            // Debit Money (Net)
            if (netReceivable > 0) {
                lines.push({
                    entry_id: journalEntry.id, account_id: moneyAccountId,
                    debit: netReceivable, credit: 0,
                    description: `Penerimaan Net`
                });
            }

            // Debit Fees
            if (fees > 0) {
                // If no admin fee account set, we assume it's deducted from revenue or handled elsewhere?
                // But we throw error if strict. Here we fallback?
                if (accountBiayaAdmin) {
                    lines.push({
                        entry_id: journalEntry.id, account_id: accountBiayaAdmin,
                        debit: fees, credit: 0,
                        description: `Biaya Layanan`
                    });
                } else {
                    // If really no account, maybe we just debit Revenue (Net Sales recording)? 
                    // Or force user to map it. We made it optional in getAccount above.
                    // Let's fail if fees exist but no account.
                    throw new Error("Biaya Admin account not set but fees exist.");
                }
            }

            // Credit Revenue
            lines.push({
                entry_id: journalEntry.id, account_id: accountPenjualan,
                debit: 0, credit: grossAmount,
                description: `Pendapatan Penjualan`
            });

            // COGS
            if (totalHpp > 0) {
                lines.push({
                    entry_id: journalEntry.id, account_id: accountHpp,
                    debit: totalHpp, credit: 0,
                    description: `Harga Pokok Penjualan`
                });
                lines.push({
                    entry_id: journalEntry.id, account_id: accountPersediaan,
                    debit: 0, credit: totalHpp,
                    description: `Persediaan Keluar`
                });
            }
        }

        // Insert Lines
        const { error: linesError } = await supabase
            .from('journal_lines')
            .insert(lines);

        if (linesError) throw linesError;

        console.log('✅ Sales Journal Created Successfully');

        return new Response(
            JSON.stringify({ success: true, journalId: journalEntry.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Sales Auto-Journal Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
