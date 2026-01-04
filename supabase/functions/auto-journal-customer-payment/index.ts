import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy Settings (Fallback)
const SETTING_KEYS = {
    ACCOUNT_PIUTANG: 'account_piutang_usaha',
    ACCOUNT_KAS: 'account_kas',
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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('📝 Starting auto journal for customer payment (V2)...');
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

        const { paymentId } = await req.json();

        if (!paymentId) {
            throw new Error('Missing paymentId');
        }

        // Fetch payment details
        const { data: payment, error: paymentError } = await supabase
            .from('customer_payments')
            .select('*, customers(name)')
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) {
            throw new Error('Payment not found');
        }

        const customerName = payment.customers?.name || 'Unknown Customer';

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

        // Resolve Credit Account (Piutang)
        const v2ArAccount = await getAccountFromV2('customer_payment', null, 'credit');
        const legacyAr = await getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PIUTANG);
        const arAccount = v2ArAccount || legacyAr;

        if (!arAccount) {
            throw new Error('Account Piutang Usaha not configured (V2 or V1)');
        }

        // Resolve Debit Account (Money In)
        let debitAccountId: string | null = null;
        const paymentMethod = payment.payment_method; // 'cash', 'bank', etc.

        if (paymentMethod === 'cash') {
            const v2Cash = await getAccountFromV2('customer_payment', 'cash', 'debit');
            const legacyCash = await getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_KAS);
            debitAccountId = v2Cash || legacyCash;
        } else {
            // Bank Payment
            // 1. Try Specific Bank Link
            if (payment.bank_account_id) {
                const { data: bankAccount } = await supabase
                    .from('bank_accounts')
                    .select('account_id')
                    .eq('id', payment.bank_account_id)
                    .single();

                if (bankAccount?.account_id) {
                    debitAccountId = bankAccount.account_id;
                    console.log(`Using Linked Bank Account: ${debitAccountId}`);
                }
            }

            // 2. Fallback to V2 Mapping for 'bank' context
            if (!debitAccountId) {
                debitAccountId = await getAccountFromV2('customer_payment', 'bank', 'debit');
            }

            // 3. Last resort: Default Bank Setting (if exists, but we don't assume one)
        }

        if (!debitAccountId) {
            throw new Error(`Account for Payment Method '${paymentMethod}' not configured`);
        }

        // Create journal entry
        const journalDescription = `Pembayaran dari ${customerName} - ${payment.payment_no}`;

        const { data: journalEntry, error: journalError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: payment.payment_date,
                description: journalDescription,
                reference_type: 'customer_payment',
                reference_id: payment.id,
                total_debit: payment.amount,
                total_credit: payment.amount,
            })
            .select()
            .single();

        if (journalError) throw journalError;

        // Create journal lines
        const journalLines = [
            {
                entry_id: journalEntry.id,
                account_id: debitAccountId,
                debit: payment.amount,
                credit: 0,
                description: `Kas/Bank - ${payment.payment_no}`,
            },
            {
                entry_id: journalEntry.id,
                account_id: arAccount,
                debit: 0,
                credit: payment.amount,
                description: `Piutang Usaha - ${customerName}`,
            },
        ];

        const { error: linesError } = await supabase
            .from('journal_lines')
            .insert(journalLines);

        if (linesError) throw linesError;

        console.log(`✅ Auto journal completed for payment ${payment.payment_no}`);

        return new Response(
            JSON.stringify({
                success: true,
                journalEntryId: journalEntry.id,
                paymentNo: payment.payment_no,
                amount: payment.amount,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error in auto-journal-customer-payment:', error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
