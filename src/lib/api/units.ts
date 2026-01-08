import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types';

export type Unit = Tables<'units'>;

export async function getUnits(): Promise<Unit[]> {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data as Unit[];
}

export async function getAllUnits(): Promise<Unit[]> {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as Unit[];
}

export async function getUnit(id: string): Promise<Unit> {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Unit;
}

export async function createUnit(unit: TablesInsert<'units'>): Promise<Unit> {
    const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();

    if (error) throw error;
    return data as Unit;
}

export async function updateUnit(
    id: string,
    updates: TablesUpdate<'units'>
): Promise<Unit> {
    const { data, error } = await supabase
        .from('units')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Unit;
}

export async function deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
