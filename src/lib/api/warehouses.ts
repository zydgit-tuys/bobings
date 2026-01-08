import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types';

export type Warehouse = Tables<'warehouses'>;

export async function getWarehouses(): Promise<Warehouse[]> {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

    if (error) throw error;
    return data as Warehouse[];
}

export async function getWarehouse(id: string): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function createWarehouse(warehouse: TablesInsert<'warehouses'>): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouse)
        .select()
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function updateWarehouse(id: string, updates: TablesUpdate<'warehouses'>): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Warehouse;
}

export async function deleteWarehouse(id: string): Promise<void> {
    const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getDefaultWarehouse(): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

    if (error) throw error;
    return data as Warehouse;
}
