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
  paymentType: 'cash' | 'bank' | 'hutang';
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

    const { purchaseId, paymentType, amount } = await req.json() as PurchaseJournalRequest;

    if (!purchaseId || !paymentType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing purchaseId or paymentType' }),
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

    const supplier = purchase.suppliers as unknown as { name: string; code: string } | null;
    const supplierName = supplier?.name || 'Unknown Supplier';
    const journalAmount = amount || purchase.total_amount;

    console.log(`📦 Processing ${paymentType} payment for purchase: ${purchase.purchase_no}`);

    // Determine credit account based on payment type
    let creditAccountId: string;
    let creditAccountName: string;
    let journalDescription: string;

    switch (paymentType) {
      case 'cash':
        creditAccountId = ACCOUNTS.KAS;
        creditAccountName = 'Kas';
        journalDescription = `Pembelian tunai dari ${supplierName} - ${purchase.purchase_no}`;
        break;
      case 'bank':
        creditAccountId = ACCOUNTS.BANK_BCA;
        creditAccountName = 'Bank BCA';
        journalDescription = `Pembelian transfer dari ${supplierName} - ${purchase.purchase_no}`;
        break;
      case 'hutang':
        creditAccountId = ACCOUNTS.HUTANG_SUPPLIER;
        creditAccountName = 'Hutang Supplier';
        journalDescription = `Pembelian kredit dari ${supplierName} - ${purchase.purchase_no}`;
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid payment type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'purchase',
        reference_id: purchaseId,
        description: journalDescription,
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creating journal entry:', entryError);
      throw new Error(`Failed to create journal entry: ${entryError.message}`);
    }

    const journalLines = [
      // Debit: Persediaan (inventory increases)
      {
        entry_id: journalEntry.id,
        account_id: ACCOUNTS.PERSEDIAAN,
        debit: journalAmount,
        credit: 0,
        description: `Penambahan persediaan - ${purchase.purchase_no}`,
      },
      // Credit: Kas / Bank / Hutang (based on payment type)
      {
        entry_id: journalEntry.id,
        account_id: creditAccountId,
        debit: 0,
        credit: journalAmount,
        description: `${creditAccountName} - ${purchase.purchase_no}`,
      },
    ];

    // Insert journal lines
    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('❌ Error creating journal lines:', linesError);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    console.log(`✅ Created journal: Debit Persediaan, Credit ${creditAccountName} = Rp ${journalAmount.toLocaleString()}`);
    console.log(`🎉 Auto journal completed for purchase ${purchase.purchase_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry.id,
        paymentType,
        purchaseNo: purchase.purchase_no,
        amount: journalAmount,
        journalDescription,
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
