import { supabase } from '@/integrations/supabase/client';

export interface Unit {
    id: string;
    code: string;
    name: string;
    symbol?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export async function getUnits() {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data as Unit[];
}

export async function getAllUnits() {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as Unit[];
}

export async function getUnit(id: string) {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Unit;
}

export async function createUnit(unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) {
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
    updates: Partial<Pick<Unit, 'name' | 'symbol' | 'is_active'>>
) {
    const { data, error } = await supabase
        .from('units')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Unit;
}

export async function deleteUnit(id: string) {
    const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
