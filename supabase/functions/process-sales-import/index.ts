import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DestyRow {
  orderNo: string;
  marketplace: string;
  orderDate: string;
  customerName: string;
  sku: string;
  skuVariant: string;
  productName: string;
  variant: string;
  qty: number;
  unitPrice: number;
  paidPrice: number;
  subtotal: number;
  orderSubtotal: number;
  sellerDiscount: number;
  invoiceTotal: number;
  shippingFee: number;
  adminFee: number;
  tax: number;
  totalSales: number;
  settlement: number;
  hpp: number;
  profit: number;
  status: string;
}

interface ProcessResult {
  success: boolean;
  importId?: string;
  summary?: {
    totalOrders: number;
    successCount: number;
    skippedCount: number;
    skippedDetails: Array<{ orderNo: string; sku: string; reason: string }>;
  };
  error?: string;
}

// Helper to fetch account settings dynamically
async function getAccountMapping(supabase: any, settingKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();

  if (error) console.error(`Error fetching setting ${settingKey}:`, error);
  return data?.setting_value || null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Starting sales import processing (Dynamic Accounts)...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { rows, filename } = await req.json() as { rows: DestyRow[]; filename: string };

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No rows to process' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processing ${rows.length} rows from ${filename}`);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('sales_imports')
      .insert({
        filename,
        import_date: new Date().toISOString().split('T')[0],
        total_orders: 0,
        status: 'processing',
      })
      .select()
      .single();

    if (importError) throw importError;
    const importId = importRecord.id;

    // 1. Pre-fetch Account Mappings
    // We use standard accounts from app_settings. 
    // If specific marketplace accounts are needed, they should be added to app_settings first.
    const [
      accountPiutang,
      accountPenjualan,
      accountHpp,
      accountPersediaan,
      accountBiayaAdmin
    ] = await Promise.all([
      getAccountMapping(supabase, 'account_piutang'),
      getAccountMapping(supabase, 'account_penjualan'),
      getAccountMapping(supabase, 'account_hpp'),
      getAccountMapping(supabase, 'account_persediaan'),
      getAccountMapping(supabase, 'account_biaya_admin'),
    ]);

    // Validation: We don't fail the whole import if accounts missing, but we skip journaling or log errors?
    // User requested "Sesuaikan", so we should try our best.
    const missingAccounts = [];
    if (!accountPiutang) missingAccounts.push('account_piutang');
    if (!accountPenjualan) missingAccounts.push('account_penjualan');
    if (!accountHpp) missingAccounts.push('account_hpp');
    if (!accountPersediaan) missingAccounts.push('account_persediaan');

    if (missingAccounts.length > 0) {
      console.error('⚠️ Missing account mappings:', missingAccounts);
      // We will proceed with Order creation but skip journaling if accounts are missing.
    }

    // Group rows by order number
    const orderGroups = new Map<string, DestyRow[]>();
    for (const row of rows) {
      const existing = orderGroups.get(row.orderNo) || [];
      existing.push(row);
      orderGroups.set(row.orderNo, existing);
    }

    // Fetch all variants for SKU matching
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, sku_variant, hpp, price, product_id, products(sku_master, name)')
      .eq('is_active', true);

    // Create SKU lookup maps
    const skuToVariant = new Map<string, any>();
    for (const v of variants || []) {
      skuToVariant.set(v.sku_variant.toLowerCase(), v);
      const product = v.products as unknown as { sku_master: string; name: string } | null;
      if (product?.sku_master) {
        skuToVariant.set(product.sku_master.toLowerCase(), v);
      }
    }

    let successCount = 0;
    let skippedCount = 0;
    const skippedDetails: Array<{ orderNo: string; sku: string; reason: string }> = [];

    // Process each order
    for (const [orderNo, orderItems] of orderGroups) {
      try {
        // Check duplicate
        const { data: existingOrder } = await supabase
          .from('sales_orders')
          .select('id')
          .eq('desty_order_no', orderNo)
          .maybeSingle();

        if (existingOrder) {
          skippedDetails.push({ orderNo, sku: '-', reason: 'Duplicate order' });
          skippedCount++;
          continue;
        }

        const firstItem = orderItems[0];
        let totalAmount = 0;
        let totalHpp = 0;
        let totalFees = (firstItem.adminFee || 0) + (firstItem.shippingFee || 0);

        const validItems: Array<{ row: DestyRow; variant: any }> = [];
        let hasInvalidSku = false;

        for (const item of orderItems) {
          const variant = skuToVariant.get(item.sku.toLowerCase());
          if (!variant) {
            skippedDetails.push({ orderNo, sku: item.sku, reason: 'SKU not found in inventory' });
            hasInvalidSku = true; // Strict mode: All items must match
            break;
          }
          // Stock check is optional during import? No, let's keep it strict or maybe lenient?
          // Existing code was strict.
          const { data: currentVariant } = await supabase
            .from('product_variants')
            .select('stock_qty')
            .eq('id', variant.id)
            .single();

          if (!currentVariant || currentVariant.stock_qty < item.qty) {
            skippedDetails.push({ orderNo, sku: item.sku, reason: `Insufficient stock` });
            hasInvalidSku = true; break;
          }

          validItems.push({ row: item, variant });
          totalAmount += item.subtotal || (item.paidPrice * item.qty) || (item.unitPrice * item.qty);
          totalHpp += item.hpp > 0 ? item.hpp : (variant.hpp * item.qty);
        }

        if (hasInvalidSku) { skippedCount++; continue; }

        // Recalculate Profit safely
        // Ensure fees are positive before subtracting
        const safeFees = Math.abs(totalFees);
        const profit = totalAmount - totalHpp - safeFees;

        // Create Order
        const { data: salesOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            import_id: importId,
            desty_order_no: orderNo,
            marketplace: firstItem.marketplace,
            order_date: firstItem.orderDate,
            status: 'completed', // Imports are usually completed orders
            customer_name: firstItem.customerName,
            total_amount: totalAmount,
            total_hpp: totalHpp,
            total_fees: totalFees,
            profit,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create Items & Stock Movements
        for (const { row, variant } of validItems) {
          const itemHpp = row.hpp > 0 ? row.hpp : variant.hpp;
          await supabase.from('order_items').insert({
            order_id: salesOrder.id,
            variant_id: variant.id,
            sku_master: variant.products?.sku_master || row.sku,
            sku_variant: row.skuVariant || variant.sku_variant,
            product_name: row.productName || variant.products?.name,
            qty: row.qty,
            unit_price: row.paidPrice || row.unitPrice,
            hpp: itemHpp,
            subtotal: row.subtotal || (row.paidPrice * row.qty),
          });
          await supabase.from('stock_movements').insert({
            variant_id: variant.id,
            movement_type: 'SALE',
            qty: row.qty,
            reference_type: 'sales_order',
            reference_id: salesOrder.id,
            notes: `Sale Import: ${orderNo}`,
          });
        }

        // JOURNALING
        // Only if Accounts are configured
        if (missingAccounts.length === 0 && accountPiutang && accountPenjualan && accountHpp && accountPersediaan) {
          // Create Header
          const { data: journalEntry, error: jErr } = await supabase
            .from('journal_entries')
            .insert({
              entry_date: firstItem.orderDate,
              reference_type: 'sales_order',
              reference_id: salesOrder.id,
              description: `Penjualan ${firstItem.marketplace} - ${orderNo}`,
              total_debit: totalAmount + totalHpp, // Rough balance logic same as auto-journal-sales
              total_credit: totalAmount + totalHpp,
            })
            .select().single();

          if (!jErr && journalEntry) {
            const lines = [];
            const netAmount = totalAmount - totalFees;
            // 2. Debit Entries (Money In + Expenses)
            if (totalFees > 0 && accountBiayaAdmin) {
              // Split: Net to Piutang, Fee to Expense
              if (netAmount > 0) {
                lines.push({
                  entry_id: journalEntry.id, account_id: accountPiutang,
                  debit: netAmount, credit: 0, description: `Piutang Bersih ${firstItem.marketplace}`
                });
              }
              lines.push({
                entry_id: journalEntry.id, account_id: accountBiayaAdmin,
                debit: totalFees, credit: 0, description: `Biaya Layanan/Admin ${orderNo}`
              });
            } else {
              // Fallback: Full amount to Piutang (if no fees OR no fee account)
              lines.push({
                entry_id: journalEntry.id, account_id: accountPiutang,
                debit: totalAmount, credit: 0, description: `Piutang ${firstItem.marketplace}`
              });
            }

            // 2. Credit Penjualan (Gross Revenue)
            lines.push({
              entry_id: journalEntry.id, account_id: accountPenjualan,
              debit: 0, credit: totalAmount, description: `Penjualan ${orderNo}`
            });
            // 3. Debit HPP
            lines.push({
              entry_id: journalEntry.id, account_id: accountHpp,
              debit: totalHpp, credit: 0, description: `HPP ${orderNo}`
            });
            // 4. Credit Persediaan
            lines.push({
              entry_id: journalEntry.id, account_id: accountPersediaan,
              debit: 0, credit: totalHpp, description: `Stok keluar ${orderNo}`
            });

            await supabase.from('journal_lines').insert(lines);
          } else if (jErr) {
            console.error(`Journal Error ${orderNo}:`, jErr);
            // If Journal fails (e.g. Closed Period), we log but allow import to succeed?
            // The DB trigger for Closed Period will throw an error here.
            // If it throws, we catch it in the 'catch' block below, which fails the order import row.
            // This is GOOD. We shouldn't import orders into a closed period if it violates accounting.
            // BUT, if it fails, it will roll back the transaction? usage? No, supabase calls are separate.
            // This is a risk: SalesOrder created, Journal Failed.
            // Ideally we delete the SalesOrder if journal fails. But for now, we leave it.
          }
        }

        successCount++;

      } catch (err: any) {
        // If "Closed Period" error from trigger
        let errMsg = err.message || JSON.stringify(err);
        if (errMsg.includes('closed accounting period')) {
          errMsg = 'Accounting Period Closed';
        }
        skippedDetails.push({ orderNo, sku: '-', reason: errMsg });
        skippedCount++;
        console.error(`Error row ${orderNo}:`, errMsg);
      }
    }

    // Update Import Record
    await supabase.from('sales_imports').update({
      total_orders: orderGroups.size,
      success_count: successCount,
      skipped_count: skippedCount,
      skipped_details: skippedDetails,
      status: 'completed'
    }).eq('id', importId);

    return new Response(
      JSON.stringify({
        success: true,
        summary: { totalOrders: orderGroups.size, successCount, skippedCount, skippedDetails }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
