import { supabase } from '@/integrations/supabase/client';
import type { SalesOrder, SalesImport, DestyRow, ParseResult, ProcessResult } from '@/types';

// ============================================
// SALES ORDERS API
// ============================================

export async function getSalesOrders(filters?: {
  startDate?: string;
  endDate?: string;
  marketplace?: string;
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
  if (filters?.status) {
    query = query.eq('status', filters.status as 'pending' | 'completed' | 'cancelled' | 'returned');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface CreateSalesOrderInput {
  order_no: string;
  order_date: string;
  marketplace?: string;
  customer_name?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'returned';
  total_fees: number;
  items: {
    variant_id: string;
    qty: number;
    unit_price: number;
    hpp: number;
  }[];
}

export async function createSalesOrder(input: CreateSalesOrderInput) {
  // Calculate totals
  const totalAmount = input.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const totalHpp = input.items.reduce((sum, item) => sum + item.qty * item.hpp, 0);
  const profit = totalAmount - totalHpp - input.total_fees;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      desty_order_no: input.order_no,
      order_date: input.order_date,
      marketplace: input.marketplace || null,
      customer_name: input.customer_name || null,
      status: input.status,
      total_amount: totalAmount,
      total_hpp: totalHpp,
      total_fees: input.total_fees,
      profit,
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

  // Deduct stock for completed orders
  if (input.status === 'completed') {
    for (const item of input.items) {
      // Get current stock
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_qty')
        .eq('id', item.variant_id)
        .single();

      if (variant) {
        // Update stock
        await supabase
          .from('product_variants')
          .update({ stock_qty: variant.stock_qty - item.qty })
          .eq('id', item.variant_id);

        // Create stock movement
        await supabase
          .from('stock_movements')
          .insert({
            variant_id: item.variant_id,
            movement_type: 'SALE',
            qty: -item.qty,
            reference_type: 'sales_order',
            reference_id: order.id,
            notes: `Sale: ${input.order_no}`,
          });
      }
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

export async function parseDestyFile(file: File): Promise<ParseResult> {
  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('parse-desty-xlsx', {
    body: formData,
  });

  if (error) throw error;
  return data as ParseResult;
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
