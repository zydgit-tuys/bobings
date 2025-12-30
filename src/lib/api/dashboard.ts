import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, startOfWeek, subDays } from 'date-fns';

// ============================================
// SALES TREND DATA (Daily/Weekly/Monthly)
// ============================================

export async function getSalesTrend(days: number = 30) {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_date, total_amount, profit, total_hpp, total_fees')
    .gte('order_date', startDate)
    .eq('status', 'completed')
    .order('order_date', { ascending: true });

  if (error) throw error;

  // Group by date
  const grouped = (data || []).reduce((acc, order) => {
    const date = order.order_date;
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, profit: 0, hpp: 0, fees: 0, orders: 0 };
    }
    acc[date].revenue += Number(order.total_amount) || 0;
    acc[date].profit += Number(order.profit) || 0;
    acc[date].hpp += Number(order.total_hpp) || 0;
    acc[date].fees += Number(order.total_fees) || 0;
    acc[date].orders++;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; profit: number; hpp: number; fees: number; orders: number }>);

  return Object.values(grouped);
}

// ============================================
// TOP PRODUCTS BY SALES
// ============================================

export async function getTopProducts(limit: number = 10, days: number = 30) {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_name,
      sku_variant,
      qty,
      subtotal,
      hpp,
      sales_orders!inner(order_date, status)
    `)
    .gte('sales_orders.order_date', startDate)
    .eq('sales_orders.status', 'completed');

  if (error) throw error;

  // Group by product
  const grouped = (data || []).reduce((acc, item) => {
    const key = item.sku_variant || item.product_name;
    if (!acc[key]) {
      acc[key] = { 
        name: item.product_name, 
        sku: item.sku_variant,
        qty: 0, 
        revenue: 0, 
        profit: 0 
      };
    }
    acc[key].qty += item.qty;
    acc[key].revenue += Number(item.subtotal) || 0;
    acc[key].profit += (Number(item.subtotal) - (Number(item.hpp) * item.qty)) || 0;
    return acc;
  }, {} as Record<string, { name: string; sku: string | null; qty: number; revenue: number; profit: number }>);

  return Object.values(grouped)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ============================================
// MARKETPLACE COMPARISON
// ============================================

export async function getMarketplaceStats(days: number = 30) {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sales_orders')
    .select('marketplace, total_amount, profit, total_fees')
    .gte('order_date', startDate)
    .eq('status', 'completed');

  if (error) throw error;

  const grouped = (data || []).reduce((acc, order) => {
    const mp = order.marketplace || 'Unknown';
    if (!acc[mp]) {
      acc[mp] = { marketplace: mp, revenue: 0, profit: 0, fees: 0, orders: 0 };
    }
    acc[mp].revenue += Number(order.total_amount) || 0;
    acc[mp].profit += Number(order.profit) || 0;
    acc[mp].fees += Number(order.total_fees) || 0;
    acc[mp].orders++;
    return acc;
  }, {} as Record<string, { marketplace: string; revenue: number; profit: number; fees: number; orders: number }>);

  return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
}

// ============================================
// STOCK MOVEMENT ANALYTICS
// ============================================

export async function getStockMovementTrend(days: number = 30) {
  const startDate = subDays(new Date(), days).toISOString();

  const { data, error } = await supabase
    .from('stock_movements')
    .select('created_at, movement_type, qty')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const grouped = (data || []).reduce((acc, mv) => {
    const date = mv.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, in: 0, out: 0, adjustment: 0, sale: 0 };
    }
    switch (mv.movement_type) {
      case 'IN':
      case 'RETURN':
        acc[date].in += mv.qty;
        break;
      case 'OUT':
        acc[date].out += mv.qty;
        break;
      case 'SALE':
        acc[date].sale += mv.qty;
        break;
      case 'ADJUSTMENT':
        acc[date].adjustment += mv.qty;
        break;
    }
    return acc;
  }, {} as Record<string, { date: string; in: number; out: number; adjustment: number; sale: number }>);

  return Object.values(grouped);
}

// ============================================
// PURCHASE ANALYTICS
// ============================================

export async function getPurchaseStats(days: number = 90) {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('purchases')
    .select(`
      order_date,
      total_amount,
      total_qty,
      status,
      suppliers(name)
    `)
    .gte('order_date', startDate)
    .order('order_date', { ascending: true });

  if (error) throw error;

  // Group by status
  const byStatus = (data || []).reduce((acc, p) => {
    if (!acc[p.status]) acc[p.status] = { count: 0, amount: 0 };
    acc[p.status].count++;
    acc[p.status].amount += Number(p.total_amount) || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  // Group by supplier
  const bySupplier = (data || []).reduce((acc, p) => {
    const name = (p.suppliers as any)?.name || 'Unknown';
    if (!acc[name]) acc[name] = { supplier: name, amount: 0, orders: 0 };
    acc[name].amount += Number(p.total_amount) || 0;
    acc[name].orders++;
    return acc;
  }, {} as Record<string, { supplier: string; amount: number; orders: number }>);

  // Trend by month
  const byMonth = (data || []).reduce((acc, p) => {
    const month = p.order_date.substring(0, 7);
    if (!acc[month]) acc[month] = { month, amount: 0, qty: 0 };
    acc[month].amount += Number(p.total_amount) || 0;
    acc[month].qty += p.total_qty;
    return acc;
  }, {} as Record<string, { month: string; amount: number; qty: number }>);

  return {
    byStatus,
    bySupplier: Object.values(bySupplier).sort((a, b) => b.amount - a.amount),
    byMonth: Object.values(byMonth),
    totalSpend: (data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0),
    totalOrders: data?.length || 0,
  };
}

// ============================================
// PROFIT MARGIN ANALYSIS
// ============================================

export async function getProfitAnalysis(days: number = 30) {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sales_orders')
    .select('total_amount, profit, total_hpp, total_fees, marketplace')
    .gte('order_date', startDate)
    .eq('status', 'completed');

  if (error) throw error;

  const totals = (data || []).reduce((acc, order) => {
    acc.revenue += Number(order.total_amount) || 0;
    acc.profit += Number(order.profit) || 0;
    acc.hpp += Number(order.total_hpp) || 0;
    acc.fees += Number(order.total_fees) || 0;
    return acc;
  }, { revenue: 0, profit: 0, hpp: 0, fees: 0 });

  const marginPercent = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const hppPercent = totals.revenue > 0 ? (totals.hpp / totals.revenue) * 100 : 0;
  const feesPercent = totals.revenue > 0 ? (totals.fees / totals.revenue) * 100 : 0;

  return {
    ...totals,
    marginPercent,
    hppPercent,
    feesPercent,
    breakdown: [
      { name: 'Profit', value: totals.profit, percent: marginPercent },
      { name: 'HPP', value: totals.hpp, percent: hppPercent },
      { name: 'Fees', value: totals.fees, percent: feesPercent },
    ],
  };
}
