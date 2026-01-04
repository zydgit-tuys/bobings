import { supabase } from '@/integrations/supabase/client';
import type { SalesOrder, SalesImport, DestyRow, ParseResult, ProcessResult } from '@/types';

// ============================================
// SALES ORDERS API
// ============================================

export async function getSalesOrders(filters?: {
  startDate?: string;
  endDate?: string;
  marketplace?: string;
  excludeMarketplace?: string; // Add this
  status?: string;
}) {
  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      order_items(*)
    `)
    .order('order_date', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('order_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('order_date', filters.endDate);
  }
  if (filters?.marketplace) {
    query = query.eq('marketplace', filters.marketplace);
  }
  if (filters?.excludeMarketplace) {
    query = query.neq('marketplace', filters.excludeMarketplace);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status as 'pending' | 'completed' | 'cancelled' | 'returned');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface CreateSalesOrderInput {
  marketplace: string;
  order_date: string;
  status?: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number;
  total_fees?: number;
  total_hpp?: number;
  items: {
    product_id?: string;
    product_name?: string;
    variant_id: string;
    sku_variant?: string;
    qty: number;
    unit_price: number;
    hpp: number;
  }[];
  order_no?: string;
  discount_amount?: number;
  payment_method?: string;
  payment_account_id?: string;
  paid_amount?: number;
  notes?: string;
}

export async function createSalesOrder(input: CreateSalesOrderInput) {
  // Always auto-generate order number via RPC
  const { data: orderNo, error: orderNoError } = await supabase.rpc('generate_sales_order_no');
  if (orderNoError) throw orderNoError;

  // Calculate HPP and profit
  const totalHpp = input.total_hpp || input.items.reduce((sum, item) => sum + item.qty * item.hpp, 0);
  const profit = (input.total_amount - (input.discount_amount || 0)) - totalHpp - (input.total_fees || 0);

  // Determine target status.
  // We force 'pending' initially to ensure items are inserted before 'completed' trigger fires.
  // 'pending' is a valid Enum value and does NOT trigger stock deduction.
  const targetStatus = (input.status || 'pending') as 'pending' | 'completed' | 'cancelled' | 'returned';

  // Create order header
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      desty_order_no: orderNo,
      order_date: input.order_date,
      marketplace: input.marketplace,
      customer_id: input.customer_id,
      customer_name: input.customer_name,
      status: 'pending', // Use 'pending' as safe initial status (valid Enum)
      total_amount: input.total_amount,
      total_fees: input.total_fees || 0,
      total_hpp: totalHpp,
      profit,
      discount_amount: input.discount_amount || 0,
      payment_method: input.payment_method,
      payment_account_id: input.payment_account_id,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Get variant info for items
  const variantIds = input.items.map(item => item.variant_id);
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku_variant, products(sku_master, name)')
    .in('id', variantIds);

  const variantMap = new Map(variants?.map(v => [v.id, v]) || []);

  // Create order items
  const orderItems = input.items.map(item => {
    const variant = variantMap.get(item.variant_id);
    return {
      order_id: order.id,
      variant_id: item.variant_id,
      sku_variant: variant?.sku_variant || null,
      sku_master: (variant?.products as any)?.sku_master || null,
      product_name: (variant?.products as any)?.name || 'Unknown',
      qty: item.qty,
      unit_price: item.unit_price,
      hpp: item.hpp,
      subtotal: item.qty * item.unit_price,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Finalize Status
  // If target was 'completed' (or anything other than 'pending'), update now.
  // This UPDATE will trigger 'process_sales_order_stock' if status becomes 'completed'.
  if (targetStatus !== 'pending') {
    const { data: updatedOrder, error: updateError } = await supabase
      .from('sales_orders')
      .update({ status: targetStatus })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedOrder;
  }

  return order;
}

export async function createSalesOrderWithJournal(input: CreateSalesOrderInput) {
  const order = await createSalesOrder(input);

  if (order.status === 'completed') {
    try {
      // Small delay to ensure DB triggers/writes are fully propogated
      await new Promise(r => setTimeout(r, 500));

      await triggerAutoJournalSales(
        order.id,
        input.payment_method || 'cash',
        input.paid_amount,
        input.payment_account_id,
        input.discount_amount
      );
      console.log('Auto-journaling triggered for sales order:', order.id);
    } catch (e) {
      console.error('Failed to auto-journal sales:', e);
    }
  }

  return order;
}

export async function updateSalesOrder(id: string, input: CreateSalesOrderInput) {
  // 1. Fetch Existing Order to check previous status
  const { data: oldOrder, error: fetchError } = await supabase
    .from('sales_orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Perform Update
  const totalAmount = input.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const totalHpp = input.items.reduce((sum, item) => sum + item.qty * item.hpp, 0);
  const profit = totalAmount - totalHpp - input.total_fees;

  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .update({
      desty_order_no: input.order_no,
      order_date: input.order_date,
      marketplace: input.marketplace || null,
      customer_name: input.customer_name || null,
      status: input.status as 'pending' | 'completed' | 'cancelled' | 'returned',
      total_amount: totalAmount,
      total_hpp: totalHpp,
      total_fees: input.total_fees,
      profit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (orderError) throw orderError;

  // Re-create items
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id);

  if (deleteError) throw deleteError;

  const variantIds = input.items.map(item => item.variant_id);
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku_variant, products(sku_master, name)')
    .in('id', variantIds);

  const variantMap = new Map(variants?.map(v => [v.id, v]) || []);

  const orderItems = input.items.map(item => {
    const variant = variantMap.get(item.variant_id);
    return {
      order_id: id,
      variant_id: item.variant_id,
      sku_variant: variant?.sku_variant || null,
      sku_master: (variant?.products as any)?.sku_master || null,
      product_name: (variant?.products as any)?.name || 'Unknown',
      qty: item.qty,
      unit_price: item.unit_price,
      hpp: item.hpp,
      subtotal: item.qty * item.unit_price,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // 4. STOCK DEDUCTION / RESTORATION handled by Database Trigger
  // trigger_sales_order_stock handles:
  // - Deduct if status -> completed
  // - Restore if status completed -> other

  return order;
}

export async function updateSalesOrderWithJournal(id: string, input: CreateSalesOrderInput) {
  // Get old status to check for transition
  const { data: oldOrder } = await supabase
    .from('sales_orders')
    .select('status')
    .eq('id', id)
    .single();

  const order = await updateSalesOrder(id, input);

  // Trigger journal if becoming completed (and wasn't before)
  // Or if it IS completed, we might want to update the journal? 
  // For now, let's just support triggering it if we move to completed.
  // Trigger journal if becoming completed (and wasn't before)
  if (order.status === 'completed' && oldOrder?.status !== 'completed') {
    const method = input.payment_method || (input.marketplace ? 'credit' : 'cash');
    try {
      await triggerAutoJournalSales(
        order.id,
        method,
        input.paid_amount,
        input.payment_account_id,
        input.discount_amount,
        false
      );
      console.log('Auto-journaling triggered for updated sales order:', order.id);
    } catch (e) {
      console.error('Failed to auto-journal sales update:', e);
    }
  }

  // Trigger journal REVERSAL if becoming 'returned'
  if (order.status === 'returned' && oldOrder?.status !== 'returned') {
    const method = input.payment_method || (input.marketplace ? 'credit' : 'cash'); // Reversal uses same method
    try {
      await triggerAutoJournalSales(
        order.id,
        method,
        input.paid_amount,
        input.payment_account_id,
        input.discount_amount,
        true
      );
      console.log('Auto-journaling RETURN triggered for:', order.id);
    } catch (e) {
      console.error('Failed to trigger return journal:', e);
    }
  }

  return order;
}

export async function getSalesOrder(id: string) {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      order_items(
        *,
        product_variants(id, sku_variant, products(name))
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SALES IMPORTS API
// ============================================

export async function getSalesImports() {
  const { data, error } = await supabase
    .from('sales_imports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSalesImport(id: string) {
  const { data, error } = await supabase
    .from('sales_imports')
    .select(`
      *,
      sales_orders(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// DESTY IMPORT FUNCTIONS
// ============================================

import * as XLSX from 'xlsx';

// Helper types and constants for Parsing
const COLUMN_MAPPINGS: Record<string, string[]> = {
  orderNo: ['Nomor Pesanan (di Desty)', 'Nomor Pesanan', 'No. Pesanan', 'Order No', 'No Pesanan'],
  marketplaceOrderNo: ['Nomor Pesanan (di Marketplace)', 'Marketplace Order No'],
  marketplace: ['Channel - Nama Toko', 'Channel', 'Marketplace', 'Platform', 'Toko'],
  orderDate: ['Tanggal Pesanan Dibuat', 'Tanggal Pesanan', 'Order Date', 'Waktu Pesanan Dibuat'],
  customerName: ['Nama Pembeli', 'Customer Name', 'Nama Customer', 'Pembeli'],
  sku: ['SKU Master', 'SKU Induk', 'SKU', 'Kode SKU'],
  skuVariant: ['SKU Marketplace', 'SKU Variant'],
  productName: ['Nama Produk', 'Product Name', 'Produk', 'Nama Barang'],
  variant: ['Varian Produk', 'Variant', 'Variasi'],
  qty: ['Jumlah', 'Qty', 'Quantity', 'Kuantitas'],
  unitPrice: ['Harga Satuan', 'Unit Price', 'Harga', 'Harga Awal'],
  paidPrice: ['Harga Dibayar', 'Paid Price'],
  subtotal: ['Subtotal Produk', 'Subtotal', 'Product Subtotal'],
  orderSubtotal: ['Subtotal Pesanan', 'Order Subtotal'],
  sellerDiscount: ['Diskon Penjual', 'Seller Discount', 'Discount'],
  invoiceTotal: ['Total Faktur', 'Invoice Total'],
  shippingFee: ['Biaya Pengiriman Final', 'Ongkir', 'Shipping Fee', 'Biaya Kirim'],
  adminFee: ['Biaya Layanan', 'Biaya Admin', 'Admin Fee', 'Service Fee'],
  tax: ['Pajak', 'Tax'],
  totalSales: ['Total Penjualan', 'Total Sales'],
  settlement: ['Penyelesaian Pembayaran', 'Settlement'],
  hpp: ['HPP', 'Cost of Goods', 'Harga Pokok'],
  profit: ['Laba Kotor', 'Gross Profit', 'Profit'],
  status: ['Status Pesanan', 'Status', 'Order Status'],
};

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const normalize = (str: string) => str.toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    const index = headers.findIndex(h =>
      h && normalize(h.toString()) === normalize(name)
    );
    if (index !== -1) return index;
  }
  return -1;
}

function parseNumeric(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.toString().replace(/[Rp.,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  if (typeof value === 'number') {
    // Excel date to JS date
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const parsed = new Date(value.toString());
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export async function parseDestyFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (workbook.SheetNames.length === 0) throw new Error('Empty workbook');

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rawData.length < 2) throw new Error('No data rows found');

        // SMART HEADER DETECTION
        // Scan first 20 rows. For each row, count how many known columns are found.
        // The row with the highest match score is the header.
        let headerRowIndex = 0;
        let maxMatchScore = 0;

        const allPossibleHeaders = new Set<string>();
        Object.values(COLUMN_MAPPINGS).forEach(names => names.forEach(n => allPossibleHeaders.add(n.toLowerCase().trim())));

        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          let matchScore = 0;
          row.forEach(cell => {
            if (cell && typeof cell === 'string') {
              if (allPossibleHeaders.has(cell.toLowerCase().trim())) {
                matchScore++;
              }
            }
          });

          if (matchScore > maxMatchScore) {
            maxMatchScore = matchScore;
            headerRowIndex = i;
          }
        }

        // If no matches found, fallback to 0 or fail? 
        // If maxMatchScore is 0, it means we scanned 20 rows and found NO known headers.
        // This likely means the file format is completely unknown or empty.
        if (maxMatchScore === 0) {
          console.warn('No known headers found in first 20 rows. Defaulting to row 0.');
        } else {
          console.log(`Found header at row ${headerRowIndex} with ${maxMatchScore} matches.`);
        }

        const headers = rawData[headerRowIndex].map(h => h?.toString() || '');
        const columnIndexes: Record<string, number> = {};
        for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
          columnIndexes[field] = findColumnIndex(headers, possibleNames);
        }

        console.log('Detected Headers (JSON):', JSON.stringify(headers));
        console.log('Mapped Columns:', columnIndexes);

        // Required headers detection check
        const criticalFields = ['orderNo', 'sku', 'qty'];
        const missingHeaders = criticalFields.filter(f => columnIndexes[f] === -1);

        if (missingHeaders.length > 0) {
          const missingNames = missingHeaders.map(f => COLUMN_MAPPINGS[f].join(' OR ')).join(', ');
          throw new Error(`Format File Tidak Sesuai. Kolom berikut tidak ditemukan: ${missingHeaders.join(', ')}.\nPastikan ada header: ${missingNames}`);
        }

        const parsedRows: DestyRow[] = [];
        const errors: string[] = [];

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const orderNo = row[columnIndexes.orderNo]?.toString()?.trim();
          const sku = row[columnIndexes.sku]?.toString()?.trim();

          if (!orderNo && !sku) continue;

          if (!orderNo) {
            // errors.push(`Row ${i + 1}: Missing order number`);
            continue; // Skip silently if just empty line
          }
          if (!sku) {
            errors.push(`Row ${i + 1}: Missing SKU for Order ${orderNo}`);
            continue;
          }

          const qty = parseNumeric(row[columnIndexes.qty]);
          if (qty <= 0) {
            errors.push(`Row ${i + 1}: Invalid quantity for Order ${orderNo}`);
            continue;
          }


          // Extract marketplace name
          const marketplace = row[columnIndexes.marketplace]?.toString()?.trim() || 'Unknown';
          // const marketplace = rawMarketplace.split('-')[0]?.trim() || rawMarketplace;

          parsedRows.push({
            orderNo,
            marketplace,
            orderDate: parseDate(row[columnIndexes.orderDate]),
            customerName: row[columnIndexes.customerName]?.toString()?.trim() || 'Unknown',
            sku,
            skuVariant: row[columnIndexes.skuVariant]?.toString()?.trim() || sku,
            productName: row[columnIndexes.productName]?.toString()?.trim() || sku,
            variant: row[columnIndexes.variant]?.toString()?.trim() || '',
            qty,
            unitPrice: parseNumeric(row[columnIndexes.unitPrice]),
            paidPrice: parseNumeric(row[columnIndexes.paidPrice]),
            subtotal: parseNumeric(row[columnIndexes.subtotal]),
            orderSubtotal: parseNumeric(row[columnIndexes.orderSubtotal]),
            sellerDiscount: Math.abs(parseNumeric(row[columnIndexes.sellerDiscount])),
            invoiceTotal: parseNumeric(row[columnIndexes.invoiceTotal]),
            shippingFee: Math.abs(parseNumeric(row[columnIndexes.shippingFee])),
            adminFee: Math.abs(parseNumeric(row[columnIndexes.adminFee])),
            tax: parseNumeric(row[columnIndexes.tax]),
            totalSales: parseNumeric(row[columnIndexes.totalSales]),
            settlement: parseNumeric(row[columnIndexes.settlement]),
            hpp: parseNumeric(row[columnIndexes.hpp]),
            profit: parseNumeric(row[columnIndexes.profit]),
            status: row[columnIndexes.status]?.toString()?.trim() || 'Completed',
          });
        }

        resolve({
          success: true,
          data: parsedRows,
          errors: errors.length > 0 ? errors : undefined,
          summary: {
            totalRows: rawData.length - headerRowIndex - 1,
            validRows: parsedRows.length,
            invalidRows: errors.length
          }
        });

      } catch (err: any) {
        console.error('Parse error:', err);
        resolve({ success: false, errors: [err.message] });
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function processSalesImport(rows: DestyRow[], filename: string): Promise<ProcessResult> {
  const { data, error } = await supabase.functions.invoke('process-sales-import', {
    body: { rows, filename },
  });

  if (error) throw error;
  return data as ProcessResult;
}

// ============================================
// SALES STATISTICS
// ============================================

export async function getSalesStats(period: 'today' | 'week' | 'month' | 'year') {
  const now = new Date();
  let startDate: string;

  switch (period) {
    case 'today':
      startDate = now.toISOString().split('T')[0];
      break;
    case 'week':
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    case 'year':
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      startDate = yearAgo.toISOString().split('T')[0];
      break;
  }

  const { data, error } = await supabase
    .from('sales_orders')
    .select('total_amount, total_hpp, total_fees, profit, marketplace')
    .gte('order_date', startDate)
    .eq('status', 'completed');

  if (error) throw error;

  const stats = {
    totalRevenue: 0,
    totalHpp: 0,
    totalFees: 0,
    totalProfit: 0,
    orderCount: 0,
    byMarketplace: {} as Record<string, { revenue: number; orders: number }>,
  };

  for (const order of data || []) {
    stats.totalRevenue += Number(order.total_amount) || 0;
    stats.totalHpp += Number(order.total_hpp) || 0;
    stats.totalFees += Number(order.total_fees) || 0;
    stats.totalProfit += Number(order.profit) || 0;
    stats.orderCount++;

    const mp = order.marketplace || 'Unknown';
    if (!stats.byMarketplace[mp]) {
      stats.byMarketplace[mp] = { revenue: 0, orders: 0 };
    }
    stats.byMarketplace[mp].revenue += Number(order.total_amount) || 0;
    stats.byMarketplace[mp].orders++;
  }

  return stats;
}

// ============================================
// AUTO JOURNAL
// ============================================

export async function triggerAutoJournalSales(
  salesOrderId: string,
  paymentMethod: string,
  paidAmount?: number,
  paymentAccountId?: string,
  discountAmount?: number,
  isReturn: boolean = false
) {
  const { data, error } = await supabase.functions.invoke('auto-journal-sales', {
    body: {
      salesOrderId,
      paymentMethod,
      amount: paidAmount,
      paymentAccountId,
      discountAmount,
      is_return: isReturn
    }
  });

  if (error) throw error;
  return data;
}

// Generate next sales invoice number (Daily sequence)
export async function generateSalesInvoiceNo() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefix = `INV-${year}${month}${day}`;

  const { data } = await supabase
    .from('sales_orders')
    .select('desty_order_no')
    .like('desty_order_no', `${prefix}%`)
    .order('desty_order_no', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNo = parseInt(data[0].desty_order_no.slice(-4)) || 0;
    return `${prefix}${String(lastNo + 1).padStart(4, '0')}`;
  }

  return `${prefix}0001`;
}
