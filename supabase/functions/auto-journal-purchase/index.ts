import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Setting keys for account mapping
const SETTING_KEYS = {
  ACCOUNT_KAS: 'account_kas',
  ACCOUNT_PERSEDIAAN: 'account_persediaan',
  ACCOUNT_HUTANG_SUPPLIER: 'account_hutang_supplier',
};

interface PurchaseJournalRequest {
  purchaseId: string;
  paymentType: 'cash' | 'bank' | 'hutang';
  bankAccountId?: string; // Optional: specific bank account ID
  amount?: number;
}

// Helper function to get account mapping from settings
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

// Helper function to get bank account
async function getBankAccount(supabase: any, bankAccountId?: string): Promise<{ accountId: string; bankName: string } | null> {
  let query = supabase
    .from('bank_accounts')
    .select('account_id, bank_name')
    .eq('is_active', true);

  if (bankAccountId) {
    query = query.eq('id', bankAccountId);
  } else {
    // Get default bank account
    query = query.eq('is_default', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    console.log('No bank account found, will use settings fallback');
    return null;
  }

  return { accountId: data.account_id, bankName: data.bank_name };
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

    const { purchaseId, paymentType, bankAccountId, amount } = await req.json() as PurchaseJournalRequest;

    if (!purchaseId || !paymentType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing purchaseId or paymentType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch account mappings from settings
    const [kasAccountId, persediaanAccountId, hutangAccountId] = await Promise.all([
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_KAS),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PERSEDIAAN),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER),
    ]);

    // Validate required accounts exist
    if (!persediaanAccountId) {
      console.error('❌ Persediaan account not configured in settings');
      return new Response(
        JSON.stringify({ success: false, error: 'Akun Persediaan belum dikonfigurasi di Settings' }),
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
        if (!kasAccountId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Akun Kas belum dikonfigurasi di Settings' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        creditAccountId = kasAccountId;
        creditAccountName = 'Kas';
        journalDescription = `Pembelian tunai dari ${supplierName} - ${purchase.purchase_no}`;
        break;

      case 'bank':
        // Try to get bank account from bank_accounts table first
        const bankAccount = await getBankAccount(supabase, bankAccountId);
        if (bankAccount) {
          creditAccountId = bankAccount.accountId;
          creditAccountName = bankAccount.bankName;
        } else {
          // Fallback to settings if no bank account configured
          const settingsBankId = await getAccountMapping(supabase, 'account_bank');
          if (!settingsBankId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Akun Bank belum dikonfigurasi. Silakan tambahkan akun bank di Settings.' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          creditAccountId = settingsBankId;
          creditAccountName = 'Bank';
        }
        journalDescription = `Pembelian transfer dari ${supplierName} - ${purchase.purchase_no}`;
        break;

      case 'hutang':
        if (!hutangAccountId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Akun Hutang Supplier belum dikonfigurasi di Settings' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        creditAccountId = hutangAccountId;
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
        account_id: persediaanAccountId,
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