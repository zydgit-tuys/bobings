import { supabase } from '@/integrations/supabase/client';
import type { Purchase, PurchaseOrderLine, PurchaseWithDetails } from '@/types';

// ============================================
// PURCHASES API
// ============================================

export async function getPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(id, code, name),
      purchase_order_lines(
        id, qty_ordered, qty_received, unit_cost, notes,
        product_variants(
           id, sku_variant,
           products(name)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPurchase(id: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(id, code, name),
      purchase_order_lines(
        *,
        product_variants(
          id, sku_variant, price,
          products(id, name, sku_master)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPurchase(purchase: {
  purchase_no?: string;
  supplier_id: string;
  order_date?: string;
  expected_date?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      ...purchase,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurchase(id: string, purchase: Partial<Purchase>) {
  const { data, error } = await supabase
    .from('purchases')
    .update(purchase)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (error) throw error;
  return data;
}

export async function confirmPurchase(id: string) {
  const { data, error } = await supabase.rpc('confirm_purchase_order', {
    p_purchase_id: id
  });

  if (error) throw error;
  return data;
}

export async function deletePurchase(id: string) {
  // First delete order lines
  await supabase.from('purchase_order_lines').delete().eq('purchase_id', id);

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// PURCHASE ORDER LINES API
// ============================================

export async function addPurchaseLine(line: {
  purchase_id: string;
  variant_id: string;
  qty_ordered: number;
  unit_cost: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .insert(line)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurchaseLine(id: string, line: Partial<PurchaseOrderLine>) {
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .update(line)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePurchaseLine(id: string) {
  const { error } = await supabase
    .from('purchase_order_lines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function receivePurchaseLines(purchaseId: string, receivedQtys: Record<string, number>) {
  // Format items for RPC: [{ line_id: "...", qty: 123 }]
  const items = Object.entries(receivedQtys).map(([lineId, qty]) => ({
    line_id: lineId,
    qty: qty
  }));

  const { error } = await supabase.rpc('receive_purchase_lines_atomic', {
    p_purchase_id: purchaseId,
    p_items: items
  });

  if (error) throw error;
}

export async function triggerAutoJournalPurchase(
  purchaseId: string,
  operationType: 'receive' | 'payment',
  paymentType?: 'cash' | 'bank',  // Optional, required for 'payment' operation
  amount?: number,
  bankAccountId?: string
) {
  const { data, error } = await supabase.functions.invoke('auto-journal-purchase', {
    body: { purchaseId, operationType, paymentType, amount, bankAccountId }
  });

  if (error) {
    // Extract more specific error message if available
    const errorMessage = error.message || 'Unknown error from Edge Function';
    throw new Error(errorMessage);
  }

  // Check if the response indicates an error
  if (data && !data.success && data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Note: Purchase number generation is now handled by database trigger
// See: supabase/migrations/20260102_refactor_po_logic.sql
