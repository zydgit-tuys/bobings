import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Setting keys matches purchase journal
const SETTING_KEYS = {
  ACCOUNT_PERSEDIAAN: 'account_persediaan',
  ACCOUNT_HUTANG_SUPPLIER: 'account_hutang_supplier',
};

interface ReturnJournalRequest {
  returnId: string;
}

// Helper function to get account mapping
async function getAccountMapping(supabase: any, settingKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching setting ${settingKey}:`, error);
    return null;
  }
  return data?.setting_value || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Starting auto journal for purchase return...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { returnId } = await req.json() as ReturnJournalRequest;

    if (!returnId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing returnId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch Account Settings
    // 1. Fetch Account Settings (V1 Fallback)
    const [setPersediaanId, setHutangId] = await Promise.all([
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PERSEDIAAN),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER),
    ]);

    // V2 MAPPING LOOKUP
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

    // Resolve Critical Accounts
    // Return: Debit Hutang (Liab Decrease), Credit Persediaan (Asset Decrease)
    const v2Hutang = await getAccountFromV2('confirm_return_purchase', null, 'debit');
    const v2Persediaan = await getAccountFromV2('confirm_return_purchase', null, 'credit');

    const persediaanAccountId = v2Persediaan || setPersediaanId;
    const hutangAccountId = v2Hutang || setHutangId;

    if (!persediaanAccountId || !hutangAccountId) {
      console.error(`❌ Accounting Configuration Error. Persediaan: ${persediaanAccountId}, Hutang: ${hutangAccountId}`);
      throw new Error(`Konfigurasi Akun Persediaan atau Hutang belum lengkap (Cek V2 Mapping atau V1 Settings)`);
    }

    if (!persediaanAccountId || !hutangAccountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Akun Persediaan atau Hutang belum dikonfigurasi di Settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Return Data with Lines and Costs
    const { data: returnData, error: fetchError } = await supabase
      .from('purchase_returns')
      .select(`
        *,
        purchase:purchases (
          purchase_no,
          suppliers (name)
        ),
        lines:purchase_return_lines (
          qty,
          purchase_line:purchase_order_lines (
            unit_cost
          )
        )
      `)
      .eq('id', returnId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching return data:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Fetch Error: ${fetchError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!returnData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Return data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY CHECK (Rule #5)
    if (returnData.status === 'completed') {
      console.log("⚠️ Return already completed. Idempotency triggered.");
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed', journalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Return Data Fetched:', JSON.stringify(returnData, null, 2));

    // 3. Calculate Total Return Amount
    let totalReturnAmount = 0;
    if (returnData.lines && Array.isArray(returnData.lines)) {
      returnData.lines.forEach((line: any) => {
        const cost = line.purchase_line?.unit_cost;
        const qty = line.qty;

        if (typeof cost !== 'number' || typeof qty !== 'number') {
          console.warn('⚠️ Invalid line data:', line);
        }

        totalReturnAmount += (qty || 0) * (cost || 0);
      });
    }

    console.log(`💰 Total Return Amount: Rp ${totalReturnAmount.toLocaleString()}`);

    const supplierName = returnData.purchase?.suppliers?.name || 'Unknown Supplier';
    const journalDescription = `Retur Pembelian ${returnData.return_no} - ${supplierName}`;

    // 4. Create Journal Entry
    console.log('📝 Creating journal header...');
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'purchase_return',
        reference_id: returnId,
        description: journalDescription,
        total_debit: totalReturnAmount,
        total_credit: totalReturnAmount
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creating journal entry:', entryError);
      return new Response(
        JSON.stringify({ success: false, error: `Journal Entry Error: ${JSON.stringify(entryError)}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Lines
    const journalLines = [
      // Debit: Hutang Supplier
      {
        entry_id: journalEntry.id,
        account_id: hutangAccountId,
        debit: totalReturnAmount,
        credit: 0,
        description: `Retur - Hutang Supplier - ${returnData.return_no}`,
      },
      // Credit: Persediaan
      {
        entry_id: journalEntry.id,
        account_id: persediaanAccountId,
        debit: 0,
        credit: totalReturnAmount,
        description: `Retur - Persediaan - ${returnData.return_no}`,
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('❌ Error creating journal lines:', linesError);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    // 5. Update Status to Completed
    const { error: updateError } = await supabase
      .from('purchase_returns')
      .update({ status: 'completed' })
      .eq('id', returnId);

    if (updateError) {
      console.error('⚠️ Failed to update return status:', updateError);
    }

    console.log(`✅ Auto journal return completed for ${returnData.return_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalId: journalEntry.id,
        amount: totalReturnAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in auto-journal-return:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
