import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy Settings Keys (Fallback only)
const SETTING_KEYS = {
  ACCOUNT_PERSEDIAAN: 'account_persediaan',
  ACCOUNT_BIAYA_PENYESUAIAN_STOK: 'account_biaya_penyesuaian_stok',
};

interface StockAdjustmentRequest {
  variantId: string;
  adjustmentQty: number; // positive = add, negative = reduce
  reason: string;
  unitCost: number;
}

// Helper function to get account mapping from settings (Fallback)
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
    console.log('📝 Starting auto journal for stock adjustment (V2)...');

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

    const { variantId, adjustmentQty, reason, unitCost } = await req.json() as StockAdjustmentRequest;

    if (!variantId || adjustmentQty === undefined || !unitCost) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Determine Context (increase/decrease)
    const context = adjustmentQty >= 0 ? 'increase' : 'decrease';

    // Resolve Accounts
    // 1. Debit Account
    const debitAccountIdv2 = await getAccountFromV2('stock_adjustment', context, 'debit');

    // 2. Credit Account
    const creditAccountIdv2 = await getAccountFromV2('stock_adjustment', context, 'credit');

    // Fallback Logic (if V2 returns null)
    let debitAccountId = debitAccountIdv2;
    let creditAccountId = creditAccountIdv2;

    if (!debitAccountId || !creditAccountId) {
      console.log("⚠️ V2 Mapping missing, falling back to V1 Settings");
      const accPersediaan = await getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PERSEDIAAN);
      const accAdjustment = await getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_BIAYA_PENYESUAIAN_STOK); // Often mapped to expense or gain

      if (context === 'increase') {
        // Debit Persediaan, Credit Gain
        debitAccountId = debitAccountId || accPersediaan;
        creditAccountId = creditAccountId || accAdjustment;
      } else {
        // Debit Loss, Credit Persediaan
        debitAccountId = debitAccountId || accAdjustment;
        creditAccountId = creditAccountId || accPersediaan;
      }
    }

    // Validate accounts exist
    if (!debitAccountId || !creditAccountId) {
      console.error('❌ Critical: Missing Account Configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Konfigurasi Akun Journal tidak lengkap (Cek V2 Tables atau V1 Settings)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch variant info
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        *,
        products (name, sku_master)
      `)
      .eq('id', variantId)
      .single();

    if (variantError || !variant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Variant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const product = variant.products as unknown as { name: string; sku_master: string } | null;
    const productName = product?.name || variant.sku_variant;
    const adjustmentValue = Math.abs(adjustmentQty) * unitCost;

    console.log(`📦 Processing stock adjustment (${context}) for ${productName}: ${adjustmentQty}`);

    // Create journal entry (stock movement already created by adjustStock RPC)
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'stock_adjustment',
        reference_id: variantId, // Use variant ID as reference
        description: `Penyesuaian stok: ${productName} (${adjustmentQty > 0 ? '+' : ''}${adjustmentQty})`,
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creating journal entry:', entryError);
      throw new Error(`Failed to create journal entry: ${entryError.message}`);
    }

    const journalLines: any[] = [];

    // LINE 1: DEBIT
    journalLines.push({
      entry_id: journalEntry.id,
      account_id: debitAccountId,
      debit: adjustmentValue,
      credit: 0,
      description: adjustmentQty > 0
        ? `Penambahan Persediaan - ${productName}`
        : `Beban Penyesuaian Stok - ${reason}`
    });

    // LINE 2: CREDIT
    journalLines.push({
      entry_id: journalEntry.id,
      account_id: creditAccountId,
      debit: 0,
      credit: adjustmentValue,
      description: adjustmentQty > 0
        ? `Keuntungan Penyesuaian Stok - ${reason}`
        : `Pengurangan Persediaan - ${productName}`
    });

    // Insert journal lines
    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('❌ Error creating journal lines:', linesError);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    console.log(`🎉 Auto journal completed for stock adjustment: ${productName}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry.id,
        adjustmentQty,
        adjustmentValue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in auto-journal-stock:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});