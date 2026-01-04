import { supabase } from "@/integrations/supabase/client";

export interface SalesReturn {
    id: string;
    sales_order_id: string;
    return_no: string;
    return_date: string;
    status: 'draft' | 'completed';
    reason: string | null;
    total_refund: number;
    created_at: string;
    sales_return_lines: SalesReturnLine[];
}

export interface SalesReturnLine {
    id: string;
    return_id: string;
    sales_order_line_id: string;
    qty: number;
    unit_price: number;
    notes: string | null;
    sales_order_lines?: {
        sku_variant: string;
        product_name: string;
    };
}

export async function createSalesReturn(data: {
    sales_order_id: string;
    return_date: string;
    reason: string;
    lines: { sales_order_line_id: string; qty: number; unit_price: number; notes?: string }[];
    is_credit_note?: boolean;
}) {
    // 1. Create Header
    const { data: returnData, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
            sales_order_id: data.sales_order_id,
            return_date: data.return_date,
            reason: data.reason,
            status: 'draft', // Always draft first
            total_refund: data.lines.reduce((acc, line) => acc + (line.qty * line.unit_price), 0),
            is_credit_note: data.is_credit_note || false
        } as any)
        .select()
        .single();

    if (returnError) throw returnError;

    // 2. Create Lines
    const linesToInsert = data.lines.map(line => ({
        return_id: returnData.id,
        sales_order_line_id: line.sales_order_line_id,
        qty: line.qty,
        unit_price: line.unit_price,
        notes: line.notes
    }));

    const { error: linesError } = await supabase
        .from('sales_return_lines')
        .insert(linesToInsert);

    if (linesError) throw linesError;

    return returnData;
}

export async function getSalesReturnsByOrderId(orderId: string) {
    const { data, error } = await supabase
        .from('sales_returns')
        .select(`
      *,
      sales_return_lines (
        *,
        sales_order_lines (
          sku_variant,
          product_name
        )
      )
    `)
        .eq('sales_order_id', orderId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function completeSalesReturn(returnId: string) {
    // 1. Update status to completed -> Triggers Stock Update
    const { data, error } = await supabase
        .from('sales_returns')
        .update({ status: 'completed' })
        .eq('id', returnId)
        .select()
        .single();

    if (error) throw error;

    // 2. Trigger Auto-Journaling (Client-side call to Edge Function)
    // We call it strictly after status update success
    try {
        const { error: funcError } = await supabase.functions.invoke('auto-journal-sales-return', {
            body: { record: data }
        });
        if (funcError) console.error("Auto-journal warning:", funcError);
    } catch (err) {
        console.error("Auto-journal error:", err);
        // We don't block the UI success if journaling fails, but we log it.
    }

    return data;
}
