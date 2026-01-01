import { supabase } from '@/integrations/supabase/client';
import type { Supplier } from '@/types';

// ============================================
// SUPPLIERS API
// ============================================

export async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function getSupplier(id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'is_active'>) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, supplier: Partial<Supplier>) {
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...supplier, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// Generate next supplier code
export async function generateSupplierCode() {
  const { data } = await supabase
    .from('suppliers')
    .select('code')
    .like('code', 'SUP%')
    .order('code', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNo = parseInt(data[0].code.slice(3)) || 0;
    return `SUP${String(lastNo + 1).padStart(4, '0')}`;
  }

  return 'SUP0001';
}
