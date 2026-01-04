
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
    ACCOUNT_HPP_PRODUCTION: 'account_hpp_production',
    ACCOUNT_HPP_PURCHASED: 'account_hpp_purchased',
    ACCOUNT_HPP_SERVICE: 'account_hpp_service',
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

        // Check accounting period status
        const { data: periodStatus, error: periodError } = await supabase
            .rpc('get_current_period_status')
            .single();

        if (periodError) {
            console.error('Error checking period status:', periodError);
            throw new Error('Unable to verify accounting period status');
        }

        if (!periodStatus.is_open) {
            console.error('Period not open:', periodStatus.message);
            throw new Error(periodStatus.message);
        }

        const { salesOrderId, paymentMethod, amount, paymentAccountId, discountAmount: reqDiscountAmount, is_return, is_credit_note } = await req.json();

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
                   product_name,
                   variant_id
                )
            `)
            .eq('id', salesOrderId)
            .single();

        if (orderError || !order) {
            throw new Error('Sales Order not found');
        }

        console.log(`Processing Order: ${order.desty_order_no}, Total: ${order.total_amount}`);

        // 2. Marketplace info for context (reporting only, not for account selection)
        const marketplace = (order.marketplace || 'Lainnya').toLowerCase();

        // Fee key still based on marketplace (for expense accounts)
        let feeKey = 'account_biaya_admin'; // Default/Generic

        if (marketplace.includes('shopee')) {
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_SHOPEE;
        } else if (marketplace.includes('tokopedia')) {
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TOKOPEDIA;
        } else if (marketplace.includes('lazada')) {
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_LAZADA;
        } else if (marketplace.includes('tiktok')) {
            feeKey = SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TIKTOK;
        }

        // 3. V2 MAPPING LOOKUP (Priority)
        const getAccountFromV2 = async (
            eventType: string,
            context: string,
            side: 'debit' | 'credit',
            mplCode: string | null = null
        ): Promise<string | null> => {
            let query = supabase
                .from('journal_account_mappings')
                .select('account_id, priority')
                .eq('event_type', eventType)
                .eq('side', side)
                .eq('is_active', true);

            // Context filter (exact match or null/wildcard)
            if (context) {
                query = query.or(`event_context.eq.${context},event_context.is.null`);
            } else {
                query = query.is('event_context', null);
            }

            // Marketplace filter
            if (mplCode) {
                query = query.or(`marketplace_code.eq.${mplCode},marketplace_code.is.null`);
            } else {
                query = query.is('marketplace_code', null);
            }

            // Order by priority desc to get specific match first
            const { data, error } = await query.order('priority', { ascending: false }).limit(1).maybeSingle();

            if (error) {
                console.error("V2 Mapping Error:", error);
                return null;
            }
            return data?.account_id || null;
        };

        // Determine Context & Marketplace Code for V2
        const eventContext = marketplace.includes('offline') || marketplace.includes('manual') ? 'manual' : 'marketplace';
        let mplCode = null;
        if (marketplace.includes('shopee')) mplCode = 'shopee';
        if (marketplace.includes('tokopedia')) mplCode = 'tokopedia';
        if (marketplace.includes('tiktok')) mplCode = 'tiktok';
        if (marketplace.includes('lazada')) mplCode = 'lazada';

        // Fetch References
        console.log(`🔎 Resolving Accounts (V2 -> V1 Fallback) for ${marketplace}...`);

        // Fetch All Relevant Settings (V1 Fallback)
        const settingKeys = [
            SETTING_KEYS.ACCOUNT_KAS,
            SETTING_KEYS.ACCOUNT_BANK,
            SETTING_KEYS.ACCOUNT_PIUTANG,
            SETTING_KEYS.ACCOUNT_PENJUALAN,
            SETTING_KEYS.ACCOUNT_HPP,
            SETTING_KEYS.ACCOUNT_PERSEDIAAN,
            SETTING_KEYS.ACCOUNT_DISKON_PENJUALAN,
            SETTING_KEYS.ACCOUNT_RETUR_PENJUALAN,
            'account_penjualan_produksi',
            'account_pendapatan_jasa'
        ];

        const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', settingKeys);

        if (settingsError) throw settingsError;

        const settingMap = new Map<string, string>(settings?.map((s: any) => [s.setting_key, s.setting_value]) || []);

        const getAccount = (key: string, fallbackKey?: string): string => {
            let val = settingMap.get(key);
            if (!val && fallbackKey) val = settingMap.get(fallbackKey);
            return val || '';
        };

        // Group revenue by product_type from order items
        const revenueByType: Record<string, number> = {
            production: 0,
            purchased: 0,
            service: 0
        };

        for (const item of order.order_items || []) {
            if (!item.variant_id) continue;

            const { data: variant } = await supabase
                .from('product_variants')
                .select('products(product_type)')
                .eq('id', item.variant_id)
                .single();

            const productType = variant?.products?.product_type || 'purchased';
            const itemRevenue = (item.qty || 0) * (item.unit_price || 0);

            revenueByType[productType] += itemRevenue;
        }

        console.log('📊 Revenue by Product Type:', revenueByType);

        // Get revenue accounts for each product type
        const getRevenueAccount = async (productType: string): Promise<string> => {
            // Try V2 mapping first (without product_type parameter for now)
            const v2Account = await getAccountFromV2('confirm_sales_order', eventContext, 'credit', mplCode);

            if (v2Account) return v2Account;

            // Fallback to V1 settings based on product type
            if (productType === 'service') {
                return getAccount('account_pendapatan_jasa', SETTING_KEYS.ACCOUNT_PENJUALAN);
            } else if (productType === 'production') {
                return getAccount('account_penjualan_produksi', SETTING_KEYS.ACCOUNT_PENJUALAN);
            } else {
                // purchased or default
                return getAccount(SETTING_KEYS.ACCOUNT_PENJUALAN, SETTING_KEYS.ACCOUNT_PENJUALAN);
            }
        };

        // Final Account Resolution
        const accountPiutang = await getAccountFromV2('confirm_sales_order', eventContext, 'debit', mplCode) || getAccount(SETTING_KEYS.ACCOUNT_PIUTANG);
        const accountDiskon = getAccount(SETTING_KEYS.ACCOUNT_DISKON_PENJUALAN, SETTING_KEYS.ACCOUNT_PENJUALAN);
        const accountHpp = getAccount(SETTING_KEYS.ACCOUNT_HPP);
        const accountPersediaan = getAccount(SETTING_KEYS.ACCOUNT_PERSEDIAAN);
        const accountKasDefault = getAccount(SETTING_KEYS.ACCOUNT_KAS);
        const accountBankDefault = getAccount(SETTING_KEYS.ACCOUNT_BANK);

        // 4. Create Header
        const description = is_return
            ? `Retur Penjualan ${order.desty_order_no}`
            : `Penjualan ${order.desty_order_no}`;

        const { data: journalEntry, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: new Date().toISOString().split('T')[0],
                reference_type: 'sales_order',
                reference_id: order.id,
                description,
                total_debit: 0,
                total_credit: 0,
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 5. Create Lines (GROSS METHOD)
        const lines = [];

        // Values from Database (Pre-calculated/Frozen)
        const grossTotal = Number(order.total_amount) || 0; // Standard POS: This is GROSS
        const discountVal = Number(reqDiscountAmount) ?? Number(order.discount_amount) ?? 0;
        const paidAmount = Number(amount) ?? Number(order.paid_amount) ?? 0;
        const totalHpp = Number(order.total_hpp) || 0;

        if (is_credit_note) {
            console.log('📝 Processing Credit Note...');

            // 1. Resolve Accounts for Credit Note (V2 Priority)
            // Revenue Account (Normal Credit side -> targeted for negative credit)
            const revenueAccount = await getAccountFromV2('credit_note', eventContext, 'credit', mplCode)
                || await getRevenueAccount('purchased'); // Fallback to sales revenue

            // AR Account (Normal Debit side -> targeted for negative debit)
            const arAccount = await getAccountFromV2('credit_note', eventContext, 'debit', mplCode)
                || accountPiutang;

            // Optional: HPP Reversal (Only if stock impact is implied/requested, usually CN is financial)
            // For now, we assume CN is financial only (price adjustment/refund) unless specified otherwise.

            // 2. Create Header
            const { data: cnEntry, error: cnError } = await supabase
                .from('journal_entries')
                .insert({
                    entry_date: new Date().toISOString().split('T')[0],
                    reference_type: 'sales_order',
                    reference_id: order.id,
                    description: `Credit Note ${order.desty_order_no}`,
                    total_debit: 0,
                    total_credit: 0, // Amounts are negative, so total absolute movement might need tracking? standard is 0 sum.
                })
                .select()
                .single();

            if (cnError) throw cnError;

            // 3. Create Negative Journal Lines (Contra-Entry)
            // Debit Revenue (Negative Credit) & Credit AR (Negative Debit) to reduce balances
            lines.push({
                entry_id: cnEntry.id, account_id: revenueAccount,
                debit: 0, credit: -grossTotal,
                description: `Credit Note Revenue ${order.desty_order_no}`
            });
            lines.push({
                entry_id: cnEntry.id, account_id: arAccount,
                debit: -grossTotal, credit: 0,
                description: `Credit Note Piutang ${order.desty_order_no}`
            });

            // Insert Lines
            const { error: linesError } = await supabase
                .from('journal_lines')
                .insert(lines);

            if (linesError) throw linesError;

            console.log('✅ Credit Note Journal Created Successfully');
            return new Response(
                JSON.stringify({ success: true, journalId: cnEntry.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (is_return) {
            // RETURN LOGIC (SIMPLIFIED REVERSAL)
            // 1. Dr Revenue (Retur), Cr AR
            lines.push({
                entry_id: journalEntry.id, account_id: getAccount(SETTING_KEYS.ACCOUNT_RETUR_PENJUALAN, SETTING_KEYS.ACCOUNT_PENJUALAN),
                debit: grossTotal, credit: 0, description: `Retur Penjualan`
            });
            lines.push({
                entry_id: journalEntry.id, account_id: accountPiutang,
                debit: 0, credit: grossTotal, description: `Reversal Piutang`
            });
            // 2. Dr Inventory, Cr HPP
            if (totalHpp > 0) {
                lines.push({
                    entry_id: journalEntry.id, account_id: accountPersediaan,
                    debit: totalHpp, credit: 0, description: `Restok Inventori`
                });
                lines.push({
                    entry_id: journalEntry.id, account_id: accountHpp,
                    debit: 0, credit: totalHpp, description: `Reversal HPP`
                });
            }
        } else {
            // SALES LOGIC (GROSS AR METHOD)
            // ... (rest of sales logic)
            // --- STEP 1: REVENUE (SPLIT BY PRODUCT TYPE) ---
            // Debit Piutang (total), Credit Revenue (split by product type)
            lines.push({
                entry_id: journalEntry.id, account_id: accountPiutang,
                debit: grossTotal, credit: 0, description: `Piutang Penjualan (Gross)`
            });

            // Create separate revenue lines for each product type
            if (revenueByType.production > 0) {
                const productionAccount = await getRevenueAccount('production');
                lines.push({
                    entry_id: journalEntry.id, account_id: productionAccount,
                    debit: 0, credit: revenueByType.production,
                    description: `Penjualan Produk Produksi`
                });
            }

            if (revenueByType.purchased > 0) {
                const purchasedAccount = await getRevenueAccount('purchased');
                lines.push({
                    entry_id: journalEntry.id, account_id: purchasedAccount,
                    debit: 0, credit: revenueByType.purchased,
                    description: `Penjualan Produk Beli Jadi`
                });
            }

            if (revenueByType.service > 0) {
                const serviceAccount = await getRevenueAccount('service');
                lines.push({
                    entry_id: journalEntry.id, account_id: serviceAccount,
                    debit: 0, credit: revenueByType.service,
                    description: `Pendapatan Jasa`
                });
            }

            // --- STEP 2: DISCOUNT ---
            if (discountVal > 0) {
                // Debit Diskon, Credit Piutang
                lines.push({
                    entry_id: journalEntry.id, account_id: accountDiskon,
                    debit: discountVal, credit: 0, description: `Diskon Penjualan`
                });
                lines.push({
                    entry_id: journalEntry.id, account_id: accountPiutang,
                    debit: 0, credit: discountVal, description: `Potongan Piutang (Diskon)`
                });
            }

            // --- STEP 3: PAYMENT ---
            if (paidAmount > 0) {
                // Determine Money Account
                let moneyAccountId = paymentAccountId;
                if (!moneyAccountId) {
                    moneyAccountId = paymentMethod === 'bank' ? accountBankDefault : accountKasDefault;
                }

                // Debit Kas/Bank, Credit Piutang
                lines.push({
                    entry_id: journalEntry.id, account_id: moneyAccountId,
                    debit: paidAmount, credit: 0, description: `Penerimaan Pembayaran (${paymentMethod})`
                });
                lines.push({
                    entry_id: journalEntry.id, account_id: accountPiutang,
                    debit: 0, credit: paidAmount, description: `Pelunasan Piutang`
                });
            }

            // --- STEP 4: COGS (Product Type-Based) ---
            // Group COGS by product type
            const cogsByType: Record<string, { hpp: number; account: string }> = {};

            for (const item of order.order_items || []) {
                if (!item.variant_id || !item.hpp || item.hpp === 0) continue;

                // Fetch product type from variant
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('products(product_type)')
                    .eq('id', item.variant_id)
                    .single();

                const productType = variant?.products?.product_type || 'purchased';
                const itemCogs = item.hpp * item.qty;

                // Skip COGS for service products
                if (productType === 'service') {
                    console.log(`Skipping COGS for service product: ${item.product_name}`);
                    continue;
                }

                // Get appropriate COGS account
                let hppAccount;
                if (productType === 'production') {
                    hppAccount = getAccount(SETTING_KEYS.ACCOUNT_HPP_PRODUCTION, SETTING_KEYS.ACCOUNT_HPP);
                } else { // 'purchased'
                    hppAccount = getAccount(SETTING_KEYS.ACCOUNT_HPP_PURCHASED, SETTING_KEYS.ACCOUNT_HPP);
                }

                // Aggregate by account
                if (!cogsByType[hppAccount]) {
                    cogsByType[hppAccount] = { hpp: 0, account: hppAccount };
                }
                cogsByType[hppAccount].hpp += itemCogs;
            }

            // Create COGS journal lines
            for (const [accountId, data] of Object.entries(cogsByType)) {
                if (data.hpp > 0) {
                    lines.push({
                        entry_id: journalEntry.id, account_id: accountId,
                        debit: data.hpp, credit: 0, description: `Harga Pokok Penjualan`
                    });
                    lines.push({
                        entry_id: journalEntry.id, account_id: accountPersediaan,
                        debit: 0, credit: data.hpp, description: `Pengurangan Persediaan`
                    });
                }
            }
        }

        // 6. Insert Lines
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
