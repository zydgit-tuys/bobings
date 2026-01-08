import { supabase } from "@/integrations/supabase/client";

export async function getPurchaseReceipts(purchaseId: string) {
    const { data, error } = await (supabase
        .from('purchase_receipts' as any) as any)
        .select(`
            *,
            lines:purchase_receipt_lines (
                *,
                purchase_line:purchase_order_lines (
                    variant:product_variants (
                        sku_variant
                    )
                )
            )
        `)
        .eq('purchase_id', purchaseId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
