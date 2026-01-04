SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_variants'
AND column_name IN ('initial_stock', 'stock_in', 'stock_out', 'stock_qty', 'available_qty');
