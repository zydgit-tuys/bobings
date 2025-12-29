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
  // Get current stock
  const { data: variant } = await supabase
    .from('product_variants')
    .select('stock_qty')
    .eq('id', variantId)
    .single();

  if (!variant) throw new Error('Variant not found');

  const newQty = variant.stock_qty + qty;
  if (newQty < 0) throw new Error('Insufficient stock');

  // Create adjustment movement
  await createStockMovement({
    variant_id: variantId,
    movement_type: 'ADJUSTMENT',
    qty: Math.abs(qty),
    notes: notes || (qty > 0 ? 'Stock adjustment (+)' : 'Stock adjustment (-)'),
  });

  // Update stock
  const { data, error } = await supabase
    .from('product_variants')
    .update({ stock_qty: newQty })
    .eq('id', variantId)
    .select()
    .single();

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
      hpp,
      price,
      products(name)
    `)
    .eq('is_active', true)
    .gt('stock_qty', 0);

  if (error) throw error;

  let totalValue = 0;
  let totalRetailValue = 0;
  let totalItems = 0;

  const items = (data || []).map(v => {
    const costValue = v.stock_qty * v.hpp;
    const retailValue = v.stock_qty * v.price;
    
    totalValue += costValue;
    totalRetailValue += retailValue;
    totalItems += v.stock_qty;

    return {
      ...v,
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
