import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Account UUIDs for journal entries
const ACCOUNTS = {
  KAS: 'acc00000-0000-0000-0000-000000000001',
  BANK_BCA: 'acc00000-0000-0000-0000-000000000002',
  PERSEDIAAN: 'acc00000-0000-0000-0000-000000000009',
  HUTANG_SUPPLIER: 'acc00000-0000-0000-0000-000000000011',
};

interface PurchaseJournalRequest {
  purchaseId: string;
  action: 'receive' | 'payment';
  paymentMethod?: 'cash' | 'bank';
  amount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Starting auto journal for purchase...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { purchaseId, action, paymentMethod = 'bank', amount } = await req.json() as PurchaseJournalRequest;

    if (!purchaseId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing purchaseId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch purchase with supplier info
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (name, code)
      `)
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      console.error('❌ Error fetching purchase:', purchaseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Processing ${action} for purchase: ${purchase.purchase_no}`);

    let journalEntry;
    const journalLines: any[] = [];

    if (action === 'receive') {
      // Journal for receiving goods:
      // Debit: Persediaan (inventory increases)
      // Credit: Hutang Supplier (liability increases)

      const supplier = purchase.suppliers as unknown as { name: string; code: string } | null;
      const supplierName = supplier?.name || 'Unknown Supplier';

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: purchase.received_date || new Date().toISOString().split('T')[0],
          reference_type: 'purchase',
          reference_id: purchaseId,
          description: `Penerimaan barang dari ${supplierName} - ${purchase.purchase_no}`,
        })
        .select()
        .single();

      if (entryError) {
        console.error('❌ Error creating journal entry:', entryError);
        throw new Error(`Failed to create journal entry: ${entryError.message}`);
      }

      journalEntry = entry;

      // Debit: Persediaan
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.PERSEDIAAN,
        debit: purchase.total_amount,
        credit: 0,
        description: `Penerimaan persediaan - ${purchase.purchase_no}`,
      });

      // Credit: Hutang Supplier
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.HUTANG_SUPPLIER,
        debit: 0,
        credit: purchase.total_amount,
        description: `Hutang kepada ${supplierName}`,
      });

      console.log(`✅ Created receive journal: Debit Persediaan, Credit Hutang Supplier = ${purchase.total_amount}`);

    } else if (action === 'payment') {
      // Journal for payment:
      // Debit: Hutang Supplier (liability decreases)
      // Credit: Kas/Bank (asset decreases)

      const paymentAmount = amount || purchase.total_amount;
      const cashAccount = paymentMethod === 'cash' ? ACCOUNTS.KAS : ACCOUNTS.BANK_BCA;
      const paymentDesc = paymentMethod === 'cash' ? 'Kas' : 'Bank BCA';

      const supplier = purchase.suppliers as unknown as { name: string; code: string } | null;
      const supplierName = supplier?.name || 'Unknown Supplier';

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          reference_type: 'purchase_payment',
          reference_id: purchaseId,
          description: `Pembayaran ke ${supplierName} - ${purchase.purchase_no}`,
        })
        .select()
        .single();

      if (entryError) {
        console.error('❌ Error creating journal entry:', entryError);
        throw new Error(`Failed to create journal entry: ${entryError.message}`);
      }

      journalEntry = entry;

      // Debit: Hutang Supplier
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.HUTANG_SUPPLIER,
        debit: paymentAmount,
        credit: 0,
        description: `Pembayaran hutang - ${purchase.purchase_no}`,
      });

      // Credit: Kas/Bank
      journalLines.push({
        entry_id: journalEntry.id,
        account_id: cashAccount,
        debit: 0,
        credit: paymentAmount,
        description: `Pembayaran via ${paymentDesc}`,
      });

      console.log(`✅ Created payment journal: Debit Hutang, Credit ${paymentDesc} = ${paymentAmount}`);
    }

    // Insert journal lines
    if (journalLines.length > 0) {
      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(journalLines);

      if (linesError) {
        console.error('❌ Error creating journal lines:', linesError);
        throw new Error(`Failed to create journal lines: ${linesError.message}`);
      }
    }

    console.log(`🎉 Auto journal completed for purchase ${purchase.purchase_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry?.id,
        action,
        purchaseNo: purchase.purchase_no,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in auto-journal-purchase:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
