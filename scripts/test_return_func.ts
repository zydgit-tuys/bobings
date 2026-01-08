
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function optimize() {
    // 1. Get a recent return
    const { data: returns } = await supabase
        .from('sales_returns')
        .select('id, return_no, return_date')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!returns || returns.length === 0) {
        console.log("No returns found to test.");
        return;
    }

    const record = returns[0];
    console.log("Testing with return:", record.return_no);

    // 2. Invoke Function
    const { data, error } = await supabase.functions.invoke('auto-journal-sales-return', {
        body: { record: record }
    });

    if (error) {
        console.error("Function Error:", error);
        if (error instanceof Error) console.error(error.message);
    } else {
        console.log("Function Success:", data);
    }
}

optimize();
