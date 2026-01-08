import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy Settings (Fallback)
const SETTING_KEYS = {
    ACCOUNT_PERSEDIAAN: 'account_persediaan',
    ACCOUNT_GAIN: 'account_biaya_penyesuaian_stok', // Usually gain/loss shared or different codes
    ACCOUNT_LOSS: 'account_biaya_penyesuaian_stok'
};

// Helper function to get account mapping from settings
async function getAccountMapping(supabase: any, settingKey: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();
    return data?.setting_value || null;
}

// Helper: Get Account by Code (Legacy Fallback)
async function getAccountByCode(supabase: any, code: string): Promise<string | null> {
    const { data } = await supabase.from('chart_of_accounts').select('id').eq('code', code).maybeSingle();
    return data?.id || null;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('📝 Starting auto journal for stock opname (V2)...');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check accounting period status
        const { data: periodStatus, error: periodError } = await supabase
            .rpc('get_current_period_status')
            .single();

        if (periodError) {
            console.error('Error checking period status:', periodError);
            return new Response(
                JSON.stringify({ success: false, error: 'Unable to verify accounting period status' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!periodStatus.is_open) {
            console.error('Period not open:', periodStatus.message);
            return new Response(
                JSON.stringify({ success: false, error: periodStatus.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { opnameId, opname_id: opnameIdLegacy } = await req.json();
        const targetOpnameId = opnameId ?? opnameIdLegacy;

        if (!targetOpnameId) {
            throw new Error('Missing opnameId');
        }

        // Fetch opname details
        const { data: opname, error: opnameError } = await supabase
            .from('stock_opname')
            .select(`
        *,
        stock_opname_lines(*)
      `)
            .eq('id', targetOpnameId)
            .single();

        if (opnameError || !opname) {
            throw new Error('Stock opname not found');
        }

        // ==========================================
        // V2 MAPPING LOOKUP
        // ==========================================
        const getAccountFromV2 = async (
            eventType: string,
            context: string | null,
            side: 'debit' | 'credit'
        ): Promise<string | null> => {
            let query = supabase
                .from('journal_account_mappings')
                .select('account_id, priority')
                .eq('event_type', eventType)
                .eq('side', side)
                .eq('is_active', true);

            if (context) {
                query = query.or(`event_context.eq.${context},event_context.is.null`);
            } else {
                query = query.is('event_context', null);
            }

            const { data, error } = await query.order('priority', { ascending: false }).limit(1).maybeSingle();
            if (error) console.error("V2 Mapping Error:", error);
            return data?.account_id || null;
        };

        // PRE-FETCH ACCOUNTS for Optimization
        // Context: 'increase' (Surplus)
        const accSurplusDebit = await getAccountFromV2('stock_opname', 'increase', 'debit');
        const accSurplusCredit = await getAccountFromV2('stock_opname', 'increase', 'credit');

        // Context: 'decrease' (Shortage)
        const accShortageDebit = await getAccountFromV2('stock_opname', 'decrease', 'debit');
        const accShortageCredit = await getAccountFromV2('stock_opname', 'decrease', 'credit');

        // Fallback Logic
        const fallbackPersediaan = await getAccountMapping(supabase, 'account_persediaan');
        const fallbackGain = await getAccountByCode(supabase, '7-101'); // Keuntungan Selisih Stok
        const fallbackLoss = await getAccountByCode(supabase, '6-101'); // Kerugian Selisih Stok

        const mapIncreaseDebit = accSurplusDebit || fallbackPersediaan;
        const mapIncreaseCredit = accSurplusCredit || fallbackGain;
        const mapDecreaseDebit = accShortageDebit || fallbackLoss;
        const mapDecreaseCredit = accShortageCredit || fallbackPersediaan;

        // Validation
        if (!mapIncreaseDebit || !mapIncreaseCredit || !mapDecreaseDebit || !mapDecreaseCredit) {
            throw new Error('Required Accounts (Persediaan, Gain, Loss) not configured in V2 or Settings');
        }

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        const journalLines: any[] = [];

        for (const line of opname.stock_opname_lines) {
            const differenceQty = line.physical_qty - line.system_qty;
            const amount = Math.abs(differenceQty) * line.unit_cost;

            if (differenceQty > 0) {
                // Surplus: Debit Inventory, Credit Gain
                journalLines.push({
                    account_id: mapIncreaseDebit,
                    debit: amount,
                    credit: 0,
                    description: `Surplus - ${line.variant_id}`,
                });
                journalLines.push({
                    account_id: mapIncreaseCredit,
                    debit: 0,
                    credit: amount,
                    description: `Keuntungan Selisih Stock`,
                });
                totalDebit += amount;
                totalCredit += amount;
            } else if (differenceQty < 0) {
                // Shortage: Debit Loss, Credit Inventory
                journalLines.push({
                    account_id: mapDecreaseDebit,
                    debit: amount,
                    credit: 0,
                    description: `Kerugian Selisih Stock`,
                });
                journalLines.push({
                    account_id: mapDecreaseCredit,
                    debit: 0,
                    credit: amount,
                    description: `Shortage - ${line.variant_id}`,
                });
                totalDebit += amount;
                totalCredit += amount;
            }
        }

        // Only create journal if there are differences
        if (journalLines.length === 0) {
            console.log('No differences found, skipping journal entry');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No differences to journal',
                    journalEntryId: null,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create journal entry
        const journalDescription = `Stock Opname - ${opname.opname_no}`;

        const { data: journalEntry, error: journalError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: opname.opname_date,
                description: journalDescription,
                reference_type: 'stock_opname',
                reference_id: opname.id,
                total_debit: totalDebit,
                total_credit: totalCredit,
            })
            .select()
            .single();

        if (journalError) throw journalError;

        // Add entry_id to all lines
        const linesWithEntryId = journalLines.map(line => ({
            ...line,
            entry_id: journalEntry.id,
        }));

        const { error: linesError } = await supabase
            .from('journal_lines')
            .insert(linesWithEntryId);

        if (linesError) throw linesError;

        console.log(`✅ Auto journal completed for opname ${opname.opname_no}`);

        return new Response(
            JSON.stringify({
                success: true,
                journalEntryId: journalEntry.id,
                opnameNo: opname.opname_no,
                totalDebit: totalDebit,
                totalCredit: totalCredit,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error in auto-journal-opname:', error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
