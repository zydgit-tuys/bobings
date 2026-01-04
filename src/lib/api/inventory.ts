import { supabase } from '@/integrations/supabase/client';
import type { StockMovement, InventoryAlert, MovementType } from '@/types';

// ============================================
// STOCK MOVEMENTS API
// ============================================

export async function getStockMovements(variantId?: string, limit = 100) {
  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      product_variants(
        id, sku_variant,
        products(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (variantId) {
    query = query.eq('variant_id', variantId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createStockMovement(movement: {
  variant_id: string;
  movement_type: MovementType;
  qty: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert(movement)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function adjustStock(variantId: string, qty: number, notes?: string) {
  const { data, error } = await supabase.rpc('adjust_inventory_atomic', {
    p_variant_id: variantId,
    p_qty: qty,
    p_notes: notes
  });

  if (error) throw error;
  return data;
}

// ============================================
// INVENTORY ALERTS API
// ============================================

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const { data, error } = await supabase.rpc('get_inventory_alerts');

  if (error) throw error;
  return data || [];
}

// ============================================
// INVENTORY VALUATION
// ============================================

export async function getInventoryValuation() {
  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id,
      sku_variant,
      stock_qty,
      price,
      products(name, base_hpp)
    `)
    .eq('is_active', true)
    .gt('stock_qty', 0);

  if (error) throw error;

  let totalValue = 0;
  let totalRetailValue = 0;
  let totalItems = 0;

  const items = (data || []).map(v => {
    // Use product base_hpp as fallback
    const product = Array.isArray(v.products) ? v.products[0] : v.products;
    const hpp = product?.base_hpp || 0;
    const costValue = v.stock_qty * hpp;
    const retailValue = v.stock_qty * v.price;

    totalValue += costValue;
    totalRetailValue += retailValue;
    totalItems += v.stock_qty;

    return {
      ...v,
      hpp, // Add hpp back to the object for UI if needed
      costValue,
      retailValue,
      potentialProfit: retailValue - costValue,
    };
  });

  return {
    items,
    summary: {
      totalItems,
      totalCostValue: totalValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalValue,
    },
  };
}

// ============================================
// OPTIMAL STOCK CALCULATION API
// ============================================

export interface OptimalStockParams {
  days_to_analyze?: number;
  safety_factor?: number;
  default_lead_time?: number;
  variant_ids?: string[];
}

export interface OptimalStockResult {
  variant_id: string;
  sku_variant: string;
  product_name: string;
  current_stock: number;
  current_min_stock: number;
  avg_daily_sales: number;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  optimal_min_stock: number;
  recommendation: string;
}

export interface OptimalStockResponse {
  success: boolean;
  params: {
    days_analyzed: number;
    safety_factor: number;
    default_lead_time: number;
  };
  summary: {
    total_variants: number;
    variants_with_sales: number;
    need_increase: number;
    need_decrease: number;
  };
  results: OptimalStockResult[];
  error?: string;
}

export async function calculateOptimalStock(params?: OptimalStockParams): Promise<OptimalStockResponse> {
  const { data, error } = await supabase.functions.invoke('calculate-optimal-stock', {
    body: params || {},
  });

  if (error) throw error;
  return data;
}

export interface ApplyStockUpdate {
  variant_id: string;
  new_min_stock: number;
}

export interface ApplyStockParams {
  updates?: ApplyStockUpdate[];
  apply_all?: boolean;
  threshold_percent?: number;
}

export interface ApplyStockResponse {
  success: boolean;
  mode: 'specific' | 'auto';
  applied: number;
  failed?: number;
  analyzed?: number;
  threshold_percent?: number;
  errors?: string[];
  error?: string;
}

export async function applyOptimalStock(params: ApplyStockParams): Promise<ApplyStockResponse> {
  const { data, error } = await supabase.functions.invoke('apply-optimal-stock', {
    body: params,
  });

  if (error) throw error;
  return data;
}

// ============================================
// AUTO JOURNAL
// ============================================

export async function triggerAutoJournalStock(
  variantId: string,
  adjustmentQty: number,
  unitCost: number,
  reason: string
) {
  const { data, error } = await supabase.functions.invoke('auto-journal-stock', {
    body: { variantId, adjustmentQty, unitCost, reason }
  });

  if (error) throw error;
  return data;
}
