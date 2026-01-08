
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { record } = await req.json();
        console.log("Processing Sales Return Journal for:", record.id, record.return_no);

        // 1. Get Return Details with allocated costs
        // We need to know the HPP of the returned items to reverse COGS.
        const { data: lines, error: linesError } = await supabase
            .from('sales_return_lines')
            .select(`
        qty,
        unit_price,
        sales_order_lines:sales_order_line_id (
          hpp
        )
      `)
            .eq('return_id', record.id);

        if (linesError) throw linesError;

        let totalRefund = 0;
        let totalHpp = 0;

        lines.forEach((line: any) => {
            totalRefund += Number(line.qty) * Number(line.unit_price);
            // HPP is from the ORIGINAL sales order line (cost at time of sale)
            totalHpp += Number(line.qty) * Number(line.sales_order_lines?.hpp || 0);
        });

        console.log("Financials:", { totalRefund, totalHpp });

        // 2. Get Sales Order Details (Marketplace)
        const { data: returnData, error: returnError } = await supabase
            .from('sales_returns')
            .select(`
                *,
                sales_orders (
                    marketplace,
                    desty_order_no
                )
            `)
            .eq('id', record.id)
            .single();

        if (returnError) throw returnError;

        // IDEMPOTENCY CHECK (Rule #5)
        if (returnData.status === 'completed') {
            console.log("⚠️ Return already completed. Idempotency triggered.");
            return new Response(JSON.stringify({ success: true, message: 'Already completed', journal_id: null }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const marketplace = returnData.sales_orders?.marketplace || '';
        const orderNo = returnData.sales_orders?.desty_order_no || '-';
        const isOffline = marketplace.toLowerCase().includes('offline');
        const isCreditNote = returnData.is_credit_note === true;

        // V2 MAPPING LOOKUP
        // Helper to query V2 mappings with correct schema
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

            // Context filter
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

            const { data, error } = await query.order('priority', { ascending: false }).limit(1).maybeSingle();

            if (error) {
                console.error("V2 Mapping Error:", error);
                return null;
            }
            return data?.account_id || null;
        };

        const eventContext = marketplace.includes('offline') ? 'manual' : 'marketplace';
        let mplCode = null;
        if (marketplace.includes('shopee')) mplCode = 'shopee';
        if (marketplace.includes('tokopedia')) mplCode = 'tokopedia';
        if (marketplace.includes('tiktok')) mplCode = 'tiktok';
        if (marketplace.includes('lazada')) mplCode = 'lazada';

        // 3. Get Account Mappings (Hybrid V2 / V1)
        const { data: settings } = await supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
                'account_retur_penjualan', // Debit
                'account_piutang',         // Credit (Online)
                'account_kas',             // Credit (Offline)
                'account_persediaan',      // Debit
                'account_hpp'             // Credit
            ]);

        const getSetting = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value;

        let accReturPenjualan, accPiutang, accKas, accPersediaan, accHpp;

        if (isCreditNote) {
            // FOR CREDIT NOTE:
            // Mapping Logic:
            // Debit: Revenue Account (Reversal) -> We look for the Revenue account (normally Credit side) and debit it.
            // Credit: AR Account (Reversal) -> We look for the AR account (normally Debit side) and credit it.

            // 1. Revenue (Debit side of CN)
            // Try to find the account that is normally CREDITED for this channel (e.g., 4101 Revenue Shopee)
            accReturPenjualan = await getAccountFromV2('credit_note', eventContext, 'credit', mplCode)
                || await getAccountFromV2('confirm_sales_order', eventContext, 'credit', mplCode) // Fallback to sales mapping
                || getSetting('account_retur_penjualan'); // Last fallback

            // 2. AR (Credit side of CN)
            // Try to find the account that is normally DEBITED for this channel (e.g., 1102 AR Shopee)
            accPiutang = await getAccountFromV2('credit_note', eventContext, 'debit', mplCode)
                || await getAccountFromV2('confirm_sales_order', eventContext, 'debit', mplCode) // Fallback to sales mapping
                || getSetting('account_piutang');

        } else {
            // STANDARD RETURN (Sales Return)
            // Debit: Sales Return (Contra Revenue) OR Revenue directly.
            // Credit: AR

            // Note: If using distinct 'sales_return' event, use that. 
            // If not, fallback to 'account_retur_penjualan' setting for the Debit side.

            accReturPenjualan = await getAccountFromV2('sales_return', eventContext, 'debit', mplCode)
                || getSetting('account_retur_penjualan');

            accPiutang = await getAccountFromV2('sales_return', eventContext, 'credit', mplCode)
                || await getAccountFromV2('confirm_sales_order', eventContext, 'debit', mplCode) // Fallback to standard AR
                || getSetting('account_piutang');
        }

        accKas = isOffline ? (getSetting('account_kas') || '1101') : null;

        // Inventory accounts only needed if NOT credit note
        if (!isCreditNote) {
            accPersediaan = await getAccountFromV2('sales_return', eventContext, 'debit', mplCode) // Wait, inv is separate event? usually just settings for simple return
                || getSetting('account_persediaan');

            accHpp = await getAccountFromV2('sales_return', eventContext, 'credit', mplCode) // HPP reversal
                || getSetting('account_hpp');
        }

        // Validate accounts
        if (!accReturPenjualan) throw new Error("Missing Account: Retur Penjualan (Revenue)");
        if (!isOffline && !accPiutang) throw new Error("Missing Account: Piutang");
        if (isOffline && !accKas) throw new Error("Missing Account: Kas");

        if (!isCreditNote) {
            if (!accPersediaan) throw new Error("Missing Account: Persediaan");
            if (!accHpp) throw new Error("Missing Account: HPP");
        }

        // Determine Credit Account (Cash vs Receivable)
        const creditAccount = isOffline ? accKas : accPiutang;
        const noteLabel = isCreditNote ? 'Credit Note' : 'Retur Penjualan';
        const creditDesc = isOffline ? `Refund Tunai (${noteLabel}) ${record.return_no}` : `Pengurangan Piutang (${noteLabel}) ${record.return_no}`;
        const journalDesc = `${noteLabel} ${record.return_no} ex ${orderNo} (${marketplace})`;

        // 4. Create Journal Entry
        const { data: journal, error: journalError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: record.return_date,
                reference_type: isCreditNote ? 'credit_note' : 'sales_return',
                reference_id: record.id,
                description: journalDesc,
                total_debit: isCreditNote ? totalRefund : (totalRefund + totalHpp),
                total_credit: isCreditNote ? totalRefund : (totalRefund + totalHpp),
                status: 'posted'
            })
            .select()
            .single();

        if (journalError) throw journalError;

        // 5. Create Journal Lines
        const journalLines = [
            // A. Financial Reversal (Reduce Revenue)
            {
                entry_id: journal.id,
                account_id: accReturPenjualan,
                debit: totalRefund,
                credit: 0,
                description: `${noteLabel} ${record.return_no}`
            },
            // Reduce Asset (Cash) or Receivable (Piutang)
            {
                entry_id: journal.id,
                account_id: creditAccount,
                debit: 0,
                credit: totalRefund,
                description: creditDesc
            }
        ];

        // B. Inventory Reversal (Restock) - ONLY IF NOT CREDIT NOTE
        if (!isCreditNote) {
            journalLines.push(
                {
                    entry_id: journal.id,
                    account_id: accPersediaan!,
                    debit: totalHpp,
                    credit: 0,
                    description: `Pengembalian Persediaan ${record.return_no}`
                },
                {
                    entry_id: journal.id,
                    account_id: accHpp!,
                    debit: 0,
                    credit: totalHpp,
                    description: `Koreksi HPP ${record.return_no}`
                }
            );
        }

        const { error: linesInsertError } = await supabase
            .from('journal_lines')
            .insert(journalLines);

        if (linesInsertError) throw linesInsertError;

        // ATOMICITY (Rule #6): Update status to completed
        const { error: updateError } = await supabase
            .from('sales_returns')
            .update({ status: 'completed' })
            .eq('id', record.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, journal_id: journal.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Error auto-journal-sales-return:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
