import { supabase } from '@/integrations/supabase/client';

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    address?: string;
    is_active: boolean;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export async function getWarehouses() {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

    if (error) throw error;
    return data as Warehouse[];
}

export async function getWarehouse(id: string) {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function createWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouse)
        .select()
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function updateWarehouse(id: string, updates: Partial<Warehouse>) {
    const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function deleteWarehouse(id: string) {
    const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getDefaultWarehouse() {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

    if (error) throw error;
    return data as Warehouse;
}
