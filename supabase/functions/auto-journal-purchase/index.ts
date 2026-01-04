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
  operationType: 'receive' | 'payment';  // Distinguish between goods receipt and payment
  paymentType?: 'cash' | 'bank';  // Required for 'payment' operation, removed 'hutang'
  bankAccountId?: string; // Optional: specific bank account ID
  amount?: number;  // Optional for partial payments
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

  // Ensure account_id exists (linked to Chart of Accounts)
  if (!data.account_id) {
    console.log(`Bank account ${data.id} found but no account_id linked`);
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

    const { purchaseId, operationType, paymentType, bankAccountId, amount } = await req.json() as PurchaseJournalRequest;

    if (!purchaseId || !operationType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing purchaseId or operationType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operationType === 'payment' && !paymentType) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentType required for payment operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. V2 MAPPING LOOKUP (Priority)
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

    // Fetch account mappings from V1 settings (Fallback)
    const [kasAccountId, setPersediaanId, setHutangId] = await Promise.all([
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_KAS),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PERSEDIAAN),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER),
    ]);

    // Resolve Critical Accounts
    // Inventory (Debit side of confirm_purchase)
    const v2Persediaan = await getAccountFromV2('confirm_purchase', null, 'debit');
    const persediaanAccountId = v2Persediaan || setPersediaanId;

    // AP (Credit side of confirm_purchase)
    const v2Hutang = await getAccountFromV2('confirm_purchase', null, 'credit');
    const hutangAccountId = v2Hutang || setHutangId;

    // Validate required accounts exist (Fail-Fast)
    if (!persediaanAccountId) {
      console.error('❌ Missing Persediaan Account (V2 or V1)');
      throw new Error('Konfigurasi Akun Persediaan tidak ditemukan (Cek Mapping V2 atau Settings V1)');
    }
    if (!hutangAccountId) {
      console.error('❌ Missing Hutang Account (V2 or V1)');
      throw new Error('Konfigurasi Akun Hutang Supplier tidak ditemukan (Cek Mapping V2 atau Settings V1)');
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

    // supplierName declaration removed (it was duplicate)

    console.log(`📦 Processing ${operationType} operation for purchase: ${purchase.purchase_no}`);

    // IDEMPOTENCY CHECK (Rule #5)
    // Check if ALREADY received fully AND no incremental amount is being processed
    // IF we are processing an incremental amount (amount is set), we bypass this check (Double Journal prevented by incremental amount logic)
    const isIncremental = amount !== undefined && amount > 0;

    if (!isIncremental && (purchase.status === 'received' || purchase.status === 'completed')) {
      console.log("⚠️ Purchase already received. Idempotency triggered.");
      return new Response(
        JSON.stringify({ success: true, message: 'Already received', journalEntryId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Variables to be set based on operation type
    let journalAmount: number;
    let journalDescription: string;
    let journalLines: any[];

    if (operationType === 'receive') {
      // ============================================
      // GOODS RECEIPT: Debit Persediaan, Credit Hutang Supplier
      // ============================================
      if (!hutangAccountId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Akun Hutang Supplier belum dikonfigurasi di Settings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      journalAmount = amount || purchase.total_amount; // Use provided partial amount, or full fallback
      const isPartialReceipt = amount && amount < purchase.total_amount;
      journalDescription = `Penerimaan barang dari ${supplierName} - ${purchase.purchase_no} ${isPartialReceipt ? '(Partial)' : ''}`;

      journalLines = [
        // Debit: Persediaan (inventory increases)
        {
          account_id: persediaanAccountId,
          debit: journalAmount,
          credit: 0,
          description: `Persediaan - ${purchase.purchase_no}`,
        },
        // Credit: Hutang Supplier (liability increases)
        {
          account_id: hutangAccountId,
          debit: 0,
          credit: journalAmount,
          description: `Hutang Supplier - ${purchase.purchase_no}`,
        },
      ];

      console.log(`✅ Goods Receipt: Debit Persediaan, Credit Hutang Supplier = Rp ${journalAmount.toLocaleString()}`);

    } else if (operationType === 'payment') {
      // ============================================
      // PAYMENT: Debit Hutang Supplier, Credit Kas/Bank
      // ============================================
      if (!hutangAccountId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Akun Hutang Supplier belum dikonfigurasi di Settings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      journalAmount = amount || purchase.total_amount;

      // Determine credit account (Kas or Bank)
      let creditAccountId: string;
      let creditAccountName: string;

      if (paymentType === 'cash') {
        if (!kasAccountId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Akun Kas belum dikonfigurasi di Settings' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        creditAccountId = kasAccountId;
        creditAccountName = 'Kas';
      } else if (paymentType === 'bank') {
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
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid paymentType. Must be "cash" or "bank".' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine if partial or full payment
      const isPartial = amount && amount < purchase.total_amount;
      const paymentLabel = isPartial
        ? `Parsial: Rp ${amount!.toLocaleString()} dari Rp ${purchase.total_amount.toLocaleString()}`
        : `Lunas: Rp ${journalAmount.toLocaleString()}`;

      journalDescription = `Pembayaran ${paymentType === 'cash' ? 'tunai' : 'transfer'} ke ${supplierName} - ${purchase.purchase_no} (${paymentLabel})`;

      journalLines = [
        // Debit: Hutang Supplier (liability decreases)
        {
          account_id: hutangAccountId,
          debit: journalAmount,
          credit: 0,
          description: `Hutang Supplier - ${purchase.purchase_no}`,
        },
        // Credit: Kas/Bank (asset decreases)
        {
          account_id: creditAccountId,
          debit: 0,
          credit: journalAmount,
          description: `${creditAccountName} - ${purchase.purchase_no}`,
        },
      ];

      console.log(`✅ Payment: Debit Hutang Supplier, Credit ${creditAccountName} = Rp ${journalAmount.toLocaleString()} ${isPartial ? '(Partial)' : '(Full)'}`);

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid operationType. Must be "receive" or "payment".' }),
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

    // Add entry_id to each line
    const journalLinesWithEntry = journalLines.map(line => ({
      ...line,
      entry_id: journalEntry.id,
    }));

    // Insert journal lines
    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLinesWithEntry);

    if (linesError) {
      console.error('❌ Error creating journal lines:', linesError);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    // ============================================
    // CHECK FOR PO COMPLETION
    // ============================================
    // If we just made a payment, check if liability is fully paid off
    if (operationType === 'payment') {
      // Fetch all journals for this PO to calculate balance
      const { data: allJournals, error: fetchJwtError } = await supabase
        .from('journal_entries')
        .select(`
          journal_lines (account_id, debit, credit)
        `)
        .eq('reference_type', 'purchase')
        .eq('reference_id', purchaseId);

      if (!fetchJwtError && allJournals) {
        let liabilityBalance = 0;
        allJournals.forEach((j: any) => {
          j.journal_lines?.forEach((l: any) => {
            if (l.account_id === hutangAccountId) {
              liabilityBalance += (l.credit - l.debit);
            }
          });
        });

        // Use a small epsilon for float comparison vs zero
        const isFullyPaid = liabilityBalance <= 100; // tolerance for small diffs due to rounding

        console.log(`💰 Liability Balance check: Rp ${liabilityBalance.toLocaleString()} -> Fully Paid? ${isFullyPaid}`);

        if (isFullyPaid && (purchase.status === 'received' || purchase.status === 'partial')) {
          console.log(`✅ PO ${purchase.purchase_no} is fully paid and received. Updating status to 'completed'...`);

          const { error: updateError } = await supabase
            .from('purchases')
            .update({ status: 'completed' })
            .eq('id', purchaseId);

          if (updateError) {
            console.error('⚠️ Failed to auto-update status to completed:', updateError);
            // Don't throw here, as the main operation (journal) succeeded
          }
        }
      }
    }

    console.log(`🎉 Auto journal completed for purchase ${purchase.purchase_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry.id,
        operationType,
        paymentType: operationType === 'payment' ? paymentType : null,
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