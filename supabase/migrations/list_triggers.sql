-- List all triggers on key tables
SELECT 
    event_object_table as table_name,
    trigger_name,
    action_statement as trigger_logic
FROM information_schema.triggers
WHERE event_object_table IN ('stock_movements', 'purchase_order_lines', 'purchase_returns', 'sales_orders')
ORDER BY event_object_table;
