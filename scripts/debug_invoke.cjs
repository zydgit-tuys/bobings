
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    // 1. Load Env
    const envPath = path.resolve(__dirname, '../.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const vars = {};
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) vars[key.trim()] = val.trim();
    });

    const supabaseUrl = vars['VITE_SUPABASE_URL'];
    const supabaseKey = vars['VITE_SUPABASE_PUBLISHABLE_KEY'];
    // Note: This is Anon Key. If RLS policies allow reading sales_returns, good. 
    // If not, we might fail to fetch data but let's try.
    // Edge function invoke might need Anon key (it's public usually) or Service.
    // If function has RLS, it uses the auth context. Here we are anon.

    console.log("Connecting to:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Get Data
    const { data: returns, error: fetchError } = await supabase
        .from('sales_returns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error("Fetch Error:", fetchError);
        return;
    }
    if (!returns || returns.length === 0) {
        console.log("No returns found.");
        return;
    }

    const record = returns[0];
    console.log("Testing with Return:", record.return_no, record.id);

    // 3. Invoke Function
    const { data, error } = await supabase.functions.invoke('auto-journal-sales-return', {
        body: { record: record }
    });

    console.log("---------------------------------------------------");
    if (error) {
        console.error("FUNCTION ERROR OBJECT:", error);
        // Supabase client often wraps the response body in 'error' if 4xx
        if (error.context) {
            // Sometimes error.context or error.message has body
            try {
                const body = await error.context.json();
                console.error("ERROR BODY:", body);
            } catch (e) {
                console.log("Raw message:", error.message);
            }
        }
    } else {
        console.log("FUNCTION SUCCESS:", data);
    }
}

main();
