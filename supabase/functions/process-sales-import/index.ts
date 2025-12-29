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
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  shippingFee: number;
  adminFee: number;
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

// Account codes for journal entries
const ACCOUNTS = {
  PIUTANG_MARKETPLACE: 'acc00000-0000-0000-0000-000000000007', // 1210
  PERSEDIAAN: 'acc00000-0000-0000-0000-000000000009', // 1310
  PENJUALAN_SHOPEE: 'acc00000-0000-0000-0000-000000000018', // 4110
  PENJUALAN_TOKOPEDIA: 'acc00000-0000-0000-0000-000000000019', // 4120
  PENJUALAN_LAZADA: 'acc00000-0000-0000-0000-000000000020', // 4130
  PENJUALAN_TIKTOK: 'acc00000-0000-0000-0000-000000000021', // 4140
  PENJUALAN_LAINNYA: 'acc00000-0000-0000-0000-000000000022', // 4150
  HPP: 'acc00000-0000-0000-0000-000000000025', // 5110
  BIAYA_ADMIN_SHOPEE: 'acc00000-0000-0000-0000-000000000027', // 5210
  BIAYA_ADMIN_TOKOPEDIA: 'acc00000-0000-0000-0000-000000000028', // 5220
  BIAYA_ADMIN_LAZADA: 'acc00000-0000-0000-0000-000000000029', // 5230
  BIAYA_ADMIN_TIKTOK: 'acc00000-0000-0000-0000-000000000030', // 5240
};

function getRevenueAccount(marketplace: string): string {
  const mp = marketplace.toLowerCase();
  if (mp.includes('shopee')) return ACCOUNTS.PENJUALAN_SHOPEE;
  if (mp.includes('tokopedia') || mp.includes('tokped')) return ACCOUNTS.PENJUALAN_TOKOPEDIA;
  if (mp.includes('lazada')) return ACCOUNTS.PENJUALAN_LAZADA;
  if (mp.includes('tiktok') || mp.includes('tik tok')) return ACCOUNTS.PENJUALAN_TIKTOK;
  return ACCOUNTS.PENJUALAN_LAINNYA;
}

function getAdminFeeAccount(marketplace: string): string {
  const mp = marketplace.toLowerCase();
  if (mp.includes('shopee')) return ACCOUNTS.BIAYA_ADMIN_SHOPEE;
  if (mp.includes('tokopedia') || mp.includes('tokped')) return ACCOUNTS.BIAYA_ADMIN_TOKOPEDIA;
  if (mp.includes('lazada')) return ACCOUNTS.BIAYA_ADMIN_LAZADA;
  if (mp.includes('tiktok') || mp.includes('tik tok')) return ACCOUNTS.BIAYA_ADMIN_TIKTOK;
  return ACCOUNTS.BIAYA_ADMIN_SHOPEE; // Default
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Starting sales import processing...');

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

    if (importError) {
      console.error('❌ Error creating import record:', importError);
      throw new Error(`Failed to create import record: ${importError.message}`);
    }

    const importId = importRecord.id;
    console.log(`📝 Created import record: ${importId}`);

    // Group rows by order number
    const orderGroups = new Map<string, DestyRow[]>();
    for (const row of rows) {
      const existing = orderGroups.get(row.orderNo) || [];
      existing.push(row);
      orderGroups.set(row.orderNo, existing);
    }

    console.log(`📊 Found ${orderGroups.size} unique orders`);

    // Fetch all variants for SKU matching
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, sku_variant, hpp, price, product_id, products(sku_master, name)')
      .eq('is_active', true);

    if (variantsError) {
      console.error('❌ Error fetching variants:', variantsError);
      throw new Error(`Failed to fetch variants: ${variantsError.message}`);
    }

    // Create SKU lookup maps
    const skuToVariant = new Map<string, any>();
    for (const v of variants || []) {
      skuToVariant.set(v.sku_variant.toLowerCase(), v);
      if (v.products?.sku_master) {
        skuToVariant.set(v.products.sku_master.toLowerCase(), v);
      }
    }

    console.log(`🔍 Loaded ${skuToVariant.size} SKU mappings`);

    let successCount = 0;
    let skippedCount = 0;
    const skippedDetails: Array<{ orderNo: string; sku: string; reason: string }> = [];

    // Process each order
    for (const [orderNo, orderItems] of orderGroups) {
      try {
        // Check for duplicate order
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
        let totalFees = firstItem.adminFee + firstItem.shippingFee;

        // Validate all items have matching SKUs
        const validItems: Array<{ row: DestyRow; variant: any }> = [];
        let hasInvalidSku = false;

        for (const item of orderItems) {
          const variant = skuToVariant.get(item.sku.toLowerCase());
          if (!variant) {
            skippedDetails.push({ orderNo, sku: item.sku, reason: 'SKU not found in inventory' });
            hasInvalidSku = true;
            break;
          }

          // Check stock availability
          const { data: currentVariant } = await supabase
            .from('product_variants')
            .select('stock_qty')
            .eq('id', variant.id)
            .single();

          if (!currentVariant || currentVariant.stock_qty < item.qty) {
            skippedDetails.push({ 
              orderNo, 
              sku: item.sku, 
              reason: `Insufficient stock (available: ${currentVariant?.stock_qty || 0}, needed: ${item.qty})` 
            });
            hasInvalidSku = true;
            break;
          }

          validItems.push({ row: item, variant });
          totalAmount += item.subtotal || (item.unitPrice * item.qty);
          totalHpp += variant.hpp * item.qty;
        }

        if (hasInvalidSku) {
          skippedCount++;
          continue;
        }

        // Create sales order
        const profit = totalAmount - totalHpp - totalFees;
        
        const { data: salesOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            import_id: importId,
            desty_order_no: orderNo,
            marketplace: firstItem.marketplace,
            order_date: firstItem.orderDate,
            status: 'completed',
            customer_name: firstItem.customerName,
            total_amount: totalAmount,
            total_hpp: totalHpp,
            total_fees: totalFees,
            profit,
          })
          .select()
          .single();

        if (orderError) {
          console.error(`❌ Error creating order ${orderNo}:`, orderError);
          skippedDetails.push({ orderNo, sku: '-', reason: `Database error: ${orderError.message}` });
          skippedCount++;
          continue;
        }

        // Create order items and stock movements
        for (const { row, variant } of validItems) {
          // Create order item
          await supabase.from('order_items').insert({
            order_id: salesOrder.id,
            variant_id: variant.id,
            sku_master: variant.products?.sku_master || row.sku,
            sku_variant: variant.sku_variant,
            product_name: row.productName || variant.products?.name,
            qty: row.qty,
            unit_price: row.unitPrice,
            hpp: variant.hpp,
            subtotal: row.subtotal || (row.unitPrice * row.qty),
          });

          // Create stock movement (will trigger stock update)
          await supabase.from('stock_movements').insert({
            variant_id: variant.id,
            movement_type: 'SALE',
            qty: row.qty,
            reference_type: 'sales_order',
            reference_id: salesOrder.id,
            notes: `Sale: ${orderNo}`,
          });
        }

        // Create journal entries for double-entry accounting
        const { data: journalEntry } = await supabase
          .from('journal_entries')
          .insert({
            entry_date: firstItem.orderDate,
            reference_type: 'sales_order',
            reference_id: salesOrder.id,
            description: `Penjualan ${firstItem.marketplace} - ${orderNo}`,
          })
          .select()
          .single();

        if (journalEntry) {
          const journalLines = [];
          
          // Debit: Piutang Marketplace (for total amount)
          journalLines.push({
            entry_id: journalEntry.id,
            account_id: ACCOUNTS.PIUTANG_MARKETPLACE,
            debit: totalAmount,
            credit: 0,
            description: `Piutang dari ${firstItem.marketplace}`,
          });

          // Credit: Penjualan (revenue)
          journalLines.push({
            entry_id: journalEntry.id,
            account_id: getRevenueAccount(firstItem.marketplace),
            debit: 0,
            credit: totalAmount,
            description: `Penjualan ${orderNo}`,
          });

          // Debit: HPP (cost of goods sold)
          journalLines.push({
            entry_id: journalEntry.id,
            account_id: ACCOUNTS.HPP,
            debit: totalHpp,
            credit: 0,
            description: `HPP ${orderNo}`,
          });

          // Credit: Persediaan (inventory reduction)
          journalLines.push({
            entry_id: journalEntry.id,
            account_id: ACCOUNTS.PERSEDIAAN,
            debit: 0,
            credit: totalHpp,
            description: `Pengurangan persediaan ${orderNo}`,
          });

          // Debit: Biaya Admin Marketplace (if any)
          if (totalFees > 0) {
            journalLines.push({
              entry_id: journalEntry.id,
              account_id: getAdminFeeAccount(firstItem.marketplace),
              debit: totalFees,
              credit: 0,
              description: `Biaya admin ${firstItem.marketplace}`,
            });

            // Credit: Piutang (reduce receivable by fees)
            journalLines.push({
              entry_id: journalEntry.id,
              account_id: ACCOUNTS.PIUTANG_MARKETPLACE,
              debit: 0,
              credit: totalFees,
              description: `Potongan biaya ${firstItem.marketplace}`,
            });
          }

          await supabase.from('journal_lines').insert(journalLines);
        }

        successCount++;
        console.log(`✅ Processed order: ${orderNo}`);

      } catch (err) {
        console.error(`❌ Error processing order ${orderNo}:`, err);
        skippedDetails.push({ orderNo, sku: '-', reason: `Error: ${err.message}` });
        skippedCount++;
      }
    }

    // Update import record
    await supabase
      .from('sales_imports')
      .update({
        total_orders: orderGroups.size,
        success_count: successCount,
        skipped_count: skippedCount,
        skipped_details: skippedDetails,
        status: 'completed',
      })
      .eq('id', importId);

    console.log(`🎉 Import completed: ${successCount} success, ${skippedCount} skipped`);

    const result: ProcessResult = {
      success: true,
      importId,
      summary: {
        totalOrders: orderGroups.size,
        successCount,
        skippedCount,
        skippedDetails,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-sales-import:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
