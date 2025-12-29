import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

const COLUMN_MAPPINGS: Record<string, string[]> = {
  orderNo: ['No. Pesanan', 'Order No', 'No Pesanan', 'Order Number', 'Nomor Pesanan'],
  marketplace: ['Marketplace', 'Channel', 'Platform', 'Toko'],
  orderDate: ['Tanggal Pesanan', 'Order Date', 'Tanggal', 'Date', 'Waktu Pesanan Dibuat'],
  customerName: ['Nama Pembeli', 'Customer Name', 'Nama Customer', 'Pembeli', 'Username (Pembeli)'],
  sku: ['SKU', 'Kode SKU', 'SKU Induk', 'Nomor Referensi SKU'],
  productName: ['Nama Produk', 'Product Name', 'Produk', 'Nama Barang'],
  qty: ['Jumlah', 'Qty', 'Quantity', 'Kuantitas'],
  unitPrice: ['Harga Satuan', 'Unit Price', 'Harga', 'Harga Awal'],
  subtotal: ['Subtotal', 'Total', 'Subtotal Pesanan', 'Total Harga Produk'],
  shippingFee: ['Ongkir', 'Shipping Fee', 'Biaya Kirim', 'Ongkos Kirim Dibayar oleh Pembeli'],
  adminFee: ['Biaya Admin', 'Admin Fee', 'Potongan', 'Biaya Administrasi'],
  status: ['Status', 'Status Pesanan', 'Order Status', 'Status Terakhir'],
};

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h && h.toString().toLowerCase().trim() === name.toLowerCase().trim()
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
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const parsed = new Date(value.toString());
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Receiving XLSX file for parsing...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, errors: ['No file provided'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Processing file: ${file.name}`);

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    if (workbook.SheetNames.length === 0) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Empty workbook'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length < 2) {
      return new Response(
        JSON.stringify({ success: false, errors: ['No data rows found'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      if (rawData[i] && rawData[i].length > 3) { headerRowIndex = i; break; }
    }

    const headers = rawData[headerRowIndex].map(h => h?.toString() || '');
    const columnIndexes: Record<string, number> = {};
    for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      columnIndexes[field] = findColumnIndex(headers, possibleNames);
    }

    const requiredFields = ['orderNo', 'sku', 'qty'];
    const missingFields = requiredFields.filter(f => columnIndexes[f] === -1);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors: [`Missing columns: ${missingFields.join(', ')}`] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedRows: DestyRow[] = [];
    const errors: string[] = [];

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const orderNo = row[columnIndexes.orderNo]?.toString()?.trim();
      const sku = row[columnIndexes.sku]?.toString()?.trim();
      if (!orderNo && !sku) continue;
      if (!orderNo) { errors.push(`Row ${i + 1}: Missing order number`); continue; }
      if (!sku) { errors.push(`Row ${i + 1}: Missing SKU`); continue; }

      const qty = parseNumeric(row[columnIndexes.qty]);
      if (qty <= 0) { errors.push(`Row ${i + 1}: Invalid quantity`); continue; }

      parsedRows.push({
        orderNo,
        marketplace: row[columnIndexes.marketplace]?.toString()?.trim() || 'Unknown',
        orderDate: parseDate(row[columnIndexes.orderDate]),
        customerName: row[columnIndexes.customerName]?.toString()?.trim() || 'Unknown',
        sku,
        productName: row[columnIndexes.productName]?.toString()?.trim() || sku,
        qty,
        unitPrice: parseNumeric(row[columnIndexes.unitPrice]),
        subtotal: parseNumeric(row[columnIndexes.subtotal]),
        shippingFee: parseNumeric(row[columnIndexes.shippingFee]),
        adminFee: parseNumeric(row[columnIndexes.adminFee]),
        status: row[columnIndexes.status]?.toString()?.trim() || 'Completed',
      });
    }

    console.log(`✅ Parsed ${parsedRows.length} valid rows`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedRows,
        errors: errors.length > 0 ? errors : undefined,
        summary: { totalRows: rawData.length - headerRowIndex - 1, validRows: parsedRows.length, invalidRows: errors.length },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, errors: [`Error: ${error.message}`] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
