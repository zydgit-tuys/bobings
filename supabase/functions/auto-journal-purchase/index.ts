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

interface ReceiptLine {
  purchase_line_id: string;
  variant_id: string;
  qty: number;
  unit_cost: number;
}

interface PurchaseJournalRequest {
  purchaseId: string;
  operationType: 'receive' | 'payment';

  // For receive operation
  receiptDate?: string;
  receiptLines?: ReceiptLine[];

  // For payment operation
  paymentDate?: string;
  paymentAmount?: number;
  paymentMethod?: 'cash' | 'bank';
  bankAccountId?: string;

  notes?: string;
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

// Generate receipt number
async function generateReceiptNo(supabase: any): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const prefix = `GR-${year}${month}-`;

  const { data } = await supabase
    .from('purchase_receipts')
    .select('receipt_no')
    .like('receipt_no', `${prefix}%`)
    .order('receipt_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sequence = 1;
  if (data) {
    const lastNo = data.receipt_no;
    const lastSeq = parseInt(lastNo.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// Generate payment number
async function generatePaymentNo(supabase: any): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const prefix = `PP-${year}${month}-`;

  const { data } = await supabase
    .from('purchase_payments')
    .select('payment_no')
    .like('payment_no', `${prefix}%`)
    .order('payment_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sequence = 1;
  if (data) {
    const lastNo = data.payment_no;
    const lastSeq = parseInt(lastNo.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
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

    const requestBody = await req.json() as PurchaseJournalRequest;
    const {
      purchaseId,
      operationType,
      receiptDate,
      receiptLines,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankAccountId,
      notes
    } = requestBody;

    if (!purchaseId || !operationType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing purchaseId or operationType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate receive operation
    if (operationType === 'receive' && (!receiptLines || receiptLines.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: 'receiptLines required for receive operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment operation
    if (operationType === 'payment') {
      if (!paymentMethod) {
        return new Response(
          JSON.stringify({ success: false, error: 'paymentMethod required for payment operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!paymentAmount || paymentAmount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'paymentAmount required and must be > 0 for payment operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Fetch account mappings from V1 settings (Fallback)
    const [kasAccountId, setPersediaanId, setHutangId] = await Promise.all([
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_KAS),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_PERSEDIAAN),
      getAccountMapping(supabase, SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER),
    ]);

    // Resolve Critical Accounts
    const v2Persediaan = await getAccountFromV2('confirm_purchase', null, 'debit');
    const persediaanAccountId = v2Persediaan || setPersediaanId;

    const v2Hutang = await getAccountFromV2('confirm_purchase', null, 'credit');
    const hutangAccountId = v2Hutang || setHutangId;

    // Validate required accounts exist
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

    console.log(`📦 Processing ${operationType} operation for purchase: ${purchase.purchase_no}`);

    // Variables to be set based on operation type
    let journalAmount: number;
    let journalDescription: string;
    let journalLines: any[];
    let receiptId: string | undefined;
    let receiptNo: string | undefined;
    let paymentId: string | undefined;
    let paymentNo: string | undefined;

    if (operationType === 'receive') {
      // ============================================
      // GOODS RECEIPT FLOW
      // ============================================

      // STEP 1: Generate receipt number
      receiptNo = await generateReceiptNo(supabase);

      // STEP 2: Calculate total from lines
      journalAmount = receiptLines!.reduce((sum, line) =>
        sum + (line.qty * line.unit_cost), 0
      );

      // STEP 3: Create receipt record
      const { data: receipt, error: receiptError } = await supabase
        .from('purchase_receipts')
        .insert({
          receipt_no: receiptNo,
          purchase_id: purchaseId,
          receipt_date: receiptDate || new Date().toISOString().split('T')[0],
          total_amount: journalAmount,
          notes: notes,
        })
        .select()
        .single();

      if (receiptError) {
        console.error('❌ Error creating receipt:', receiptError);
        throw new Error(`Failed to create receipt: ${receiptError.message}`);
      }

      receiptId = receipt.id;
      console.log(`✅ Receipt created: ${receiptNo} (Rp ${journalAmount.toLocaleString()})`);

      // STEP 4: Create receipt lines
      const lines = receiptLines!.map(line => ({
        receipt_id: receipt.id,
        purchase_line_id: line.purchase_line_id,
        variant_id: line.variant_id,
        received_qty: line.qty,
        unit_cost: line.unit_cost,
        subtotal: line.qty * line.unit_cost,
      }));

      const { error: linesError } = await supabase
        .from('purchase_receipt_lines')
        .insert(lines);

      if (linesError) {
        console.error('❌ Error creating receipt lines:', linesError);
        throw new Error(`Failed to create receipt lines: ${linesError.message}`);
      }

      console.log(`✅ Created ${lines.length} receipt lines`);

      // STEP 5: Prepare journal entry
      const isPartialReceipt = journalAmount < purchase.total_amount;
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
      // PAYMENT FLOW
      // ============================================

      // STEP 1: Generate payment number
      paymentNo = await generatePaymentNo(supabase);

      journalAmount = paymentAmount!;

      // STEP 2: Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('purchase_payments')
        .insert({
          payment_no: paymentNo,
          purchase_id: purchaseId,
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
          payment_amount: journalAmount,
          payment_method: paymentMethod!,
          bank_account_id: bankAccountId,
          notes: notes,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Error creating payment:', paymentError);
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      paymentId = payment.id;
      console.log(`✅ Payment created: ${paymentNo} (Rp ${journalAmount.toLocaleString()})`);

      // STEP 3: Determine credit account (Kas or Bank)
      let creditAccountId: string;
      let creditAccountName: string;

      if (paymentMethod === 'cash') {
        if (!kasAccountId) {
          throw new Error('Akun Kas belum dikonfigurasi di Settings');
        }
        creditAccountId = kasAccountId;
        creditAccountName = 'Kas';
      } else if (paymentMethod === 'bank') {
        const bankAccount = await getBankAccount(supabase, bankAccountId);
        if (bankAccount) {
          creditAccountId = bankAccount.accountId;
          creditAccountName = bankAccount.bankName;
        } else {
          const settingsBankId = await getAccountMapping(supabase, 'account_bank');
          if (!settingsBankId) {
            throw new Error('Akun Bank belum dikonfigurasi. Silakan tambahkan akun bank di Settings.');
          }
          creditAccountId = settingsBankId;
          creditAccountName = 'Bank';
        }
      } else {
        throw new Error('Invalid paymentMethod. Must be "cash" or "bank".');
      }

      // STEP 4: Prepare journal entry
      const isPartial = journalAmount < purchase.total_amount;
      const paymentLabel = isPartial
        ? `Parsial: Rp ${journalAmount.toLocaleString()} dari Rp ${purchase.total_amount.toLocaleString()}`
        : `Lunas: Rp ${journalAmount.toLocaleString()}`;

      journalDescription = `Pembayaran ${paymentMethod === 'cash' ? 'tunai' : 'transfer'} ke ${supplierName} - ${purchase.purchase_no} (${paymentLabel})`;

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
      throw new Error('Invalid operationType. Must be "receive" or "payment".');
    }

    // ============================================
    // CREATE JOURNAL ENTRY
    // ============================================

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

    console.log(`✅ Journal entry created: ${journalEntry.id}`);

    // ============================================
    // LINK JOURNAL TO RECEIPT/PAYMENT
    // ============================================

    if (operationType === 'receive' && receiptId) {
      await supabase
        .from('purchase_receipts')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', receiptId);

      console.log(`✅ Linked journal ${journalEntry.id} to receipt ${receiptNo}`);
    } else if (operationType === 'payment' && paymentId) {
      await supabase
        .from('purchase_payments')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', paymentId);

      console.log(`✅ Linked journal ${journalEntry.id} to payment ${paymentNo}`);
    }

    console.log(`🎉 Auto journal completed for purchase ${purchase.purchase_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        journalEntryId: journalEntry.id,
        operationType,

        // Receipt info
        receiptNo: receiptNo,
        receiptId: receiptId,

        // Payment info
        paymentNo: paymentNo,
        paymentId: paymentId,

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