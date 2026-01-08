import { supabase } from "@/integrations/supabase/client";

export interface JournalAccountMapping {
    id: string;
    event_type: string;
    event_context: string | null;
    side: 'debit' | 'credit';
    account_id: string;
    product_type: string | null;
    marketplace_code: string | null;
    is_active: boolean;
    priority: number;
    created_at: string;
    updated_at: string;
    account?: {
        code: string;
        name: string;
    };
}

export async function getJournalAccountMappings() {
    const { data, error } = await supabase
        .from('journal_account_mappings')
        .select(`
      *,
      account:chart_of_accounts!account_id (
        code,
        name
      )
    `)
        .order('event_type', { ascending: true })
        .order('priority', { ascending: false })
        .order('side', { ascending: true });

    if (error) throw error;
    return data as JournalAccountMapping[];
}

export async function upsertJournalAccountMapping(
    mapping: Omit<JournalAccountMapping, 'created_at' | 'updated_at' | 'account'>
) {
    const { data, error } = await supabase
        .from('journal_account_mappings')
        .upsert(mapping)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteJournalAccountMapping(id: string) {
    const { error } = await supabase
        .from('journal_account_mappings')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function toggleMappingActive(id: string, isActive: boolean) {
    const { error } = await supabase
        .from('journal_account_mappings')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) throw error;
}
