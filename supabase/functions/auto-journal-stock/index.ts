import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Account UUIDs
const ACCOUNTS = {
  PERSEDIAAN: 'acc00000-0000-0000-0000-000000000009',
  BIAYA_PENYESUAIAN_STOK: 'acc00000-0000-0000-0000-000000000033', // 6900 - Stock Adjustment Expense
};

interface StockAdjustmentRequest {
  variantId: string;
  adjustmentQty: number; // positive = add, negative = reduce
  reason: string;
  unitCost: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Starting auto journal for stock adjustment...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { variantId, adjustmentQty, reason, unitCost } = await req.json() as StockAdjustmentRequest;

    if (!variantId || adjustmentQty === undefined || !unitCost) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
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
      console.error('❌ Error fetching variant:', variantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Variant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const product = variant.products as unknown as { name: string; sku_master: string } | null;
    const productName = product?.name || variant.sku_variant;
    const adjustmentValue = Math.abs(adjustmentQty) * unitCost;

    console.log(`📦 Processing stock adjustment for ${productName}: ${adjustmentQty > 0 ? '+' : ''}${adjustmentQty}`);

    // Create stock movement first
    const movementType = adjustmentQty > 0 ? 'IN' : 'OUT';
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        variant_id: variantId,
        movement_type: 'ADJUSTMENT',
        qty: adjustmentQty, // can be negative for reduction
        reference_type: 'adjustment',
        notes: reason || 'Stock adjustment',
      })
      .select()
      .single();

    if (movementError) {
      console.error('❌ Error creating stock movement:', movementError);
      throw new Error(`Failed to create stock movement: ${movementError.message}`);
    }

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'stock_adjustment',
        reference_id: movement.id,
        description: `Penyesuaian stok: ${productName} (${adjustmentQty > 0 ? '+' : ''}${adjustmentQty})`,
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creating journal entry:', entryError);
      throw new Error(`Failed to create journal entry: ${entryError.message}`);
    }

    const journalLines: any[] = [];

    if (adjustmentQty > 0) {
      // Stock increase (e.g., found items, returns)
      // Debit: Persediaan (inventory increases)
      // Credit: Stock Adjustment (gain)
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.PERSEDIAAN,
        debit: adjustmentValue,
        credit: 0,
        description: `Penambahan persediaan - ${productName}`,
      });

      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.BIAYA_PENYESUAIAN_STOK,
        debit: 0,
        credit: adjustmentValue,
        description: `Penyesuaian stok (keuntungan) - ${reason}`,
      });
    } else {
      // Stock decrease (e.g., damaged, lost, expired)
      // Debit: Stock Adjustment Expense (loss)
      // Credit: Persediaan (inventory decreases)
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.BIAYA_PENYESUAIAN_STOK,
        debit: adjustmentValue,
        credit: 0,
        description: `Penyesuaian stok (kerugian) - ${reason}`,
      });

      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.PERSEDIAAN,
        debit: 0,
        credit: adjustmentValue,
        description: `Pengurangan persediaan - ${productName}`,
      });
    }

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
        movementId: movement.id,
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
