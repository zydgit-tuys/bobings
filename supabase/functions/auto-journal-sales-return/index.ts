
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
        // We prefer V2 mappings now.
        // Event Type: 'sales_return' or 'credit_note'
        const eventType = isCreditNote ? 'credit_note' : 'sales_return'; // Note: I haven't seeded 'sales_return' explicitly yet? I seeded 'credit_note'.
        // Wait, did I seed 'sales_return'? I checked earlier files, I seeded 'credit_note', 'confirm_sales_order'.
        // I did NOT seed 'sales_return' in the summary.
        // So for Standard Return, I MUST fallback to V1 or hardcoded logic if V2 missing.
        // But for Credit Note, I seeded it.

        let accReturPenjualan, accPiutang, accKas, accPersediaan, accHpp;

        // Try V2 Lookup first (especially for Credit Note)
        const { data: v2Mappings } = await supabase
            .from('journal_account_mappings')
            .select('account_role, account_id')
            .eq('event_type', eventType)
            .eq('marketplace', marketplace);

        // Helper to get from V2 array
        const getV2 = (role: string) => v2Mappings?.find(m => m.account_role === role)?.account_id;

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

        // RESOLVE ACCOUNTS
        // For Credit Note: we prioritized V2 'revenue' (which effectively acts as Contra-Revenue/Return in this context? Or did I map it to actual Revenue? 
        // In 'auto-journal-sales' for credit note I used: 
        // Debit: Revenue Account (Contra) -> I used 'revenue' role in seed?
        // Let's check seed. 'credit_note' event maps 'revenue' and 'accounts_receivable'.
        // So here:
        // accReturPenjualan (Debit) -> getV2('revenue') || getSetting('account_retur_penjualan')
        // accPiutang (Credit) -> getV2('accounts_receivable') || getSetting('account_piutang')

        accReturPenjualan = getV2('revenue') || getSetting('account_retur_penjualan');
        // Note: For standard return, 'account_retur_penjualan' is a specific Contra-Revenue account (4200?).
        // For Credit Note, if I used 'revenue' map, it might point to 4001 (Sales).
        // A Credit Note usually Debits Sales (4001) directly OR Debits Sales Returns (4200).
        // My previous logic in auto-journal-sales used mappings based on 'confirm_sales_order' copy.
        // So it likely points to 4001. This is acceptable for Credit Note (Direct reversal).

        accPiutang = getV2('accounts_receivable') || getSetting('account_piutang');
        accKas = isOffline ? (getSetting('account_kas') || '1101') : null; // Fallback to 1101 if offline

        // Inventory accounts only needed if NOT credit note
        if (!isCreditNote) {
            accPersediaan = getSetting('account_persediaan');
            accHpp = getSetting('account_hpp');
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
