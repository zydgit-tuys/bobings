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
      total_received,
      total_paid,
      total_returned,
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
  return data as any;
}

export async function getPurchase(id: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      total_received,
      total_paid,
      total_returned,
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
  return data as any;
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
    } as any)
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

// ============================================
// AUTO-JOURNAL API (V2 - With Tracking)
// ============================================

export interface ReceiptLine {
  purchase_line_id: string;
  variant_id: string;
  qty: number;
  unit_cost: number;
}

export interface AutoJournalReceiveRequest {
  purchaseId: string;
  operationType: 'receive';
  receiptLines: ReceiptLine[];
  receiptDate?: string;
  notes?: string;
}

export interface AutoJournalPaymentRequest {
  purchaseId: string;
  operationType: 'payment';
  paymentAmount: number;
  paymentMethod: 'cash' | 'bank';
  paymentDate?: string;
  bankAccountId?: string;
  notes?: string;
}

export type AutoJournalPurchaseRequest = AutoJournalReceiveRequest | AutoJournalPaymentRequest;

export async function triggerAutoJournalPurchase(request: AutoJournalPurchaseRequest) {
  const { data, error } = await supabase.functions.invoke('auto-journal-purchase', {
    body: request
  });

  if (error) {
    const errorMessage = error.message || 'Unknown error from Edge Function';
    throw new Error(errorMessage);
  }

  if (data && !data.success && data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Helper function for receive operation
export async function receivePurchase(
  purchaseId: string,
  receiptLines: ReceiptLine[],
  options?: {
    receiptDate?: string;
    notes?: string;
  }
) {
  return triggerAutoJournalPurchase({
    purchaseId,
    operationType: 'receive',
    receiptLines,
    receiptDate: options?.receiptDate,
    notes: options?.notes,
  });
}

// Helper function for payment operation
export async function payPurchase(
  purchaseId: string,
  paymentAmount: number,
  paymentMethod: 'cash' | 'bank',
  options?: {
    paymentDate?: string;
    bankAccountId?: string;
    notes?: string;
  }
) {
  return triggerAutoJournalPurchase({
    purchaseId,
    operationType: 'payment',
    paymentAmount,
    paymentMethod,
    paymentDate: options?.paymentDate,
    bankAccountId: options?.bankAccountId,
    notes: options?.notes,
  });
}


// Note: Purchase number generation is now handled by database trigger
// See: supabase/migrations/20260102_refactor_po_logic.sql
