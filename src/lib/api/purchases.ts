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
      suppliers(id, code, name)
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
          id, sku_variant, price, hpp,
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
  purchase_no: string;
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
      order_date: purchase.order_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurchase(id: string, purchase: Partial<Purchase>) {
  const { data, error } = await supabase
    .from('purchases')
    .update({ ...purchase, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

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
    .insert({
      ...line,
      subtotal: line.qty_ordered * line.unit_cost,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurchaseLine(id: string, line: Partial<PurchaseOrderLine>) {
  const updateData: Partial<PurchaseOrderLine> = { ...line };
  
  // Recalculate subtotal if qty or cost changed
  if (line.qty_ordered !== undefined || line.unit_cost !== undefined) {
    const { data: current } = await supabase
      .from('purchase_order_lines')
      .select('qty_ordered, unit_cost')
      .eq('id', id)
      .single();
    
    if (current) {
      const qty = line.qty_ordered ?? current.qty_ordered;
      const cost = line.unit_cost ?? current.unit_cost;
      updateData.subtotal = qty * cost;
    }
  }

  const { data, error } = await supabase
    .from('purchase_order_lines')
    .update(updateData)
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
  const updates = Object.entries(receivedQtys).map(([lineId, qty]) =>
    supabase
      .from('purchase_order_lines')
      .update({ qty_received: qty })
      .eq('id', lineId)
  );

  await Promise.all(updates);

  // Update purchase status
  const { data: lines } = await supabase
    .from('purchase_order_lines')
    .select('qty_ordered, qty_received')
    .eq('purchase_id', purchaseId);

  if (lines) {
    const allReceived = lines.every(l => l.qty_received >= l.qty_ordered);
    const someReceived = lines.some(l => l.qty_received > 0);

    const status = allReceived ? 'received' : someReceived ? 'partial' : 'ordered';
    
    await supabase
      .from('purchases')
      .update({ 
        status, 
        received_date: allReceived ? new Date().toISOString().split('T')[0] : null 
      })
      .eq('id', purchaseId);
  }
}

// Generate next purchase number
export async function generatePurchaseNo() {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const { data } = await supabase
    .from('purchases')
    .select('purchase_no')
    .like('purchase_no', `${prefix}%`)
    .order('purchase_no', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNo = parseInt(data[0].purchase_no.slice(-4)) || 0;
    return `${prefix}${String(lastNo + 1).padStart(4, '0')}`;
  }
  
  return `${prefix}0001`;
}
