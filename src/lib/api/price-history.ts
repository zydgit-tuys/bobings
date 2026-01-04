import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryRecord {
    id: string;
    variant_id: string;
    old_harga_jual_umum: number | null;
    old_harga_jual_khusus: number | null;
    old_hpp: number | null;
    new_harga_jual_umum: number | null;
    new_harga_jual_khusus: number | null;
    new_hpp: number | null;
    changed_by: string | null;
    changed_at: string | null;
    reason: string | null;
    created_at: string;
}

export interface PriceHistoryFilters {
    startDate?: string;
    endDate?: string;
}

export const getPriceHistory = async (variantId: string, filters?: PriceHistoryFilters) => {
    let query = supabase
        .from('product_variant_price_history')
        .select('*')
        .eq('variant_id', variantId)
        .order('changed_at', { ascending: false });

    if (filters?.startDate) {
        query = query.gte('changed_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('changed_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as PriceHistoryRecord[];
};
