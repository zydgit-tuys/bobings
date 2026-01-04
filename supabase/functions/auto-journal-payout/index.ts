import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('📝 Starting auto journal for marketplace payout...');
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

        const { payoutId } = await req.json();

        if (!payoutId) {
            throw new Error('Missing payoutId');
        }

        // Fetch payout details
        const { data: payout, error: payoutError } = await supabase
            .from('marketplace_payouts')
            .select('*')
            .eq('id', payoutId)
            .single();

        if (payoutError || !payout) {
            throw new Error('Payout not found');
        }

        // Get account IDs
        const { data: arMarketplaceAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '1-106')
            .single();

        const { data: feeAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '6-102')
            .single();

        if (!arMarketplaceAccount || !feeAccount) {
            throw new Error('Marketplace accounts not configured');
        }

        // Get bank account
        const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .select('account_id')
            .eq('id', payout.bank_account_id)
            .single();

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        // Create journal entry
        const journalDescription = `Payout ${payout.marketplace_code} - ${payout.payout_reference}`;
        const grossAmount = payout.gross_sales || 0;
        const feeAmount = payout.total_fee || 0;
        const netAmount = payout.net_amount || 0;

        const { data: journalEntry, error: journalError } = await supabase
            .from('journal_entries')
            .insert({
                entry_date: payout.payout_date,
                description: journalDescription,
                reference_type: 'marketplace_payout',
                reference_id: payout.id,
                total_debit: grossAmount,
                total_credit: grossAmount,
            })
            .select()
            .single();

        if (journalError) throw journalError;

        // Create journal lines
        const journalLines = [
            // Debit: Bank (net amount received)
            {
                entry_id: journalEntry.id,
                account_id: bankAccount.account_id,
                debit: netAmount,
                credit: 0,
                description: `Bank - Payout ${payout.marketplace_code}`,
            },
            // Debit: Fee Expense
            {
                entry_id: journalEntry.id,
                account_id: feeAccount.id,
                debit: feeAmount,
                credit: 0,
                description: `Biaya Komisi ${payout.marketplace_code}`,
            },
            // Credit: AR Marketplace
            {
                entry_id: journalEntry.id,
                account_id: arMarketplaceAccount.id,
                debit: 0,
                credit: grossAmount,
                description: `Piutang ${payout.marketplace_code}`,
            },
        ];

        const { error: linesError } = await supabase
            .from('journal_lines')
            .insert(journalLines);

        if (linesError) throw linesError;

        console.log(`✅ Auto journal completed for payout ${payout.payout_reference}`);

        return new Response(
            JSON.stringify({
                success: true,
                journalEntryId: journalEntry.id,
                payoutReference: payout.payout_reference,
                netAmount: netAmount,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error in auto-journal-payout:', error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
