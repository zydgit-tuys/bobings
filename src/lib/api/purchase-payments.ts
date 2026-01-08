import { supabase } from "@/integrations/supabase/client";

export async function getPurchasePayments(purchaseId: string) {
    const { data, error } = await (supabase
        .from('purchase_payments' as any) as any)
        .select(`
            *,
            bank_accounts (
                bank_name,
                account_number,
                account_holder
            )
        `)
        .eq('purchase_id', purchaseId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
