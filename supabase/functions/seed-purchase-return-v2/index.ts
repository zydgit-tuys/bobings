
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get Accounts
        const { data: accPersediaan } = await supabase.from('chart_of_accounts').select('id').eq('code', '1203').single();
        const { data: accHutang } = await supabase.from('chart_of_accounts').select('id').eq('code', '2001').single();

        if (!accPersediaan || !accHutang) {
            throw new Error('Accounts not found (1203 or 2001)');
        }

        // 2. Insert Mappings (Manual Idempotency)

        // Debit: Hutang (Reverse Liability)
        const { data: existingDebit } = await supabase
            .from('journal_account_mappings')
            .select('id')
            .eq('event_type', 'confirm_return_purchase')
            .eq('side', 'debit')
            .limit(1)
            .maybeSingle();

        if (!existingDebit) {
            await supabase.from('journal_account_mappings').insert({
                event_type: 'confirm_return_purchase',
                event_context: null,
                side: 'debit',
                account_id: accHutang.id, // Debit Hutang
                priority: 10,
                is_active: true
            });
        }

        // Credit: Persediaan (Reverse Asset)
        const { data: existingCredit } = await supabase
            .from('journal_account_mappings')
            .select('id')
            .eq('event_type', 'confirm_return_purchase')
            .eq('side', 'credit')
            .limit(1)
            .maybeSingle();

        if (!existingCredit) {
            await supabase.from('journal_account_mappings').insert({
                event_type: 'confirm_return_purchase',
                event_context: null,
                side: 'credit',
                account_id: accPersediaan.id, // Credit Persediaan
                priority: 10,
                is_active: true
            });
        }

        return new Response(JSON.stringify({ success: true, message: "Use V2 Purchase Return Seeded" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
