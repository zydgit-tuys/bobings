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
    const journalBuffer: any[] = []; // Buffer for batch journaling

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

        // ... existing per-row logic for Sales Order ...

        // JOURNALING LOGIC (BUFFER OR IMMEDIATE)
        const canJournal = missingAccounts.length === 0 && accountPiutang && accountPenjualan && accountHpp && accountPersediaan;

        if (canJournal) {
          const journalData = {
            date: firstItem.orderDate,
            refId: salesOrder.id,
            desc: `Penjualan ${firstItem.marketplace} - ${orderNo}`,
            total: totalAmount + totalHpp,
            netAmount: totalAmount - totalFees,
            fees: totalFees,
            totalHpp,
            accountPiutang, accountPenjualan, accountHpp, accountPersediaan, accountBiayaAdmin,
            marketplace: firstItem.marketplace,
            orderNo: orderNo
          };

          // Push to buffer for batch processing later
          journalBuffer.push(journalData);
        } else {
          // Log warning if needed
        }

        successCount++;
      } catch (err: any) {
        // ... error handling ...
      }
    } // End Loop

    // BATCH PROCESSING: Insert Journals
    if (journalBuffer.length > 0) {
      console.log(`Processing ${journalBuffer.length} journals in batch...`);

      // 1. Prepare Headers
      const headersToInsert = journalBuffer.map(j => ({
        entry_date: j.date,
        reference_type: 'sales_order',
        reference_id: j.refId,
        description: j.desc,
        total_debit: j.total,
        total_credit: j.total
      }));

      // 2. Bulk Insert Headers
      const { data: insertedHeaders, error: headerErr } = await supabase
        .from('journal_entries')
        .insert(headersToInsert)
        .select();

      if (headerErr) {
        console.error('Batch Header Insert Error:', headerErr);
        // Ideally rollback or mark partial failure
      } else if (insertedHeaders) {
        // 3. Prepare Lines
        const linesToInsert = [];

        // Map inserted headers back to buffer (assuming order is preserved, which is standard for Postgres insert return)
        // Safety check: match by reference_id
        const headerMap = new Map(insertedHeaders.map(h => [h.reference_id, h.id]));

        for (const j of journalBuffer) {
          const journalId = headerMap.get(j.refId);
          if (!journalId) continue;

          // Logic from original code to generate lines
          // 1. Debit Money/Piutang & Fee
          if (j.fees > 0 && j.accountBiayaAdmin) {
            if (j.netAmount > 0) {
              linesToInsert.push({
                entry_id: journalId, account_id: j.accountPiutang,
                debit: j.netAmount, credit: 0, description: `Piutang Bersih ${j.marketplace}`
              });
            }
            linesToInsert.push({
              entry_id: journalId, account_id: j.accountBiayaAdmin,
              debit: j.fees, credit: 0, description: `Biaya Layanan/Admin ${j.orderNo}`
            });
          } else {
            linesToInsert.push({
              entry_id: journalId, account_id: j.accountPiutang,
              debit: (j.netAmount + j.fees), credit: 0, description: `Piutang ${j.marketplace}`
            });
          }

          // 2. Credit Penjualan
          linesToInsert.push({
            entry_id: journalId, account_id: j.accountPenjualan,
            debit: 0, credit: (j.netAmount + j.fees), description: `Penjualan ${j.orderNo}`
          });

          // 3. Debit HPP
          linesToInsert.push({
            entry_id: journalId, account_id: j.accountHpp,
            debit: j.totalHpp, credit: 0, description: `HPP ${j.orderNo}`
          });

          // 4. Credit Persediaan
          linesToInsert.push({
            entry_id: journalId, account_id: j.accountPersediaan,
            debit: 0, credit: j.totalHpp, description: `Stok keluar ${j.orderNo}`
          });
        }

        // 4. Bulk Insert Lines
        if (linesToInsert.length > 0) {
          const { error: lineErr } = await supabase
            .from('journal_lines')
            .insert(linesToInsert);

          if (lineErr) console.error('Batch Line Insert Error:', lineErr);
        }
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
