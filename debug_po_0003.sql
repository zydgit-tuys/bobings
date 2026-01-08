SELECT 
    purchase_no, 
    status, 
    total_amount, 
    public.get_total_received_amount(id) as received_val, 
    public.get_total_paid_amount(id) as paid_val, 
    public.get_total_return_amount(id) as returned_val 
FROM public.purchases 
WHERE purchase_no = 'PO-20260104-0003';
