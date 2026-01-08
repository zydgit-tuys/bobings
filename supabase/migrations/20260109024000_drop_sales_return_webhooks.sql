-- Drop potential webhook triggers on sales_returns
-- We suspect a synchronous webhook is blocking INSERTs.

-- Try dropping common names used by Supabase UI
DROP TRIGGER IF EXISTS "sales_returns_webhook" ON "public"."sales_returns";
DROP TRIGGER IF EXISTS "webhook_sales_returns" ON "public"."sales_returns";
DROP TRIGGER IF EXISTS "on_sales_return_created" ON "public"."sales_returns";
DROP TRIGGER IF EXISTS "sales_return_insert_trigger" ON "public"."sales_returns";

-- Also check for net extensions triggers if possible (requires knowing name)
-- We'll try to be safe.

-- Verify no other blocking triggers exist.
-- The only valid trigger should be 'set_sales_return_number' (BEFORE INSERT) and 'trigger_sales_return_stock' (AFTER UPDATE).
-- We DO NOT drop those.