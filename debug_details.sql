-- Check Order Lines
SELECT id, qty_ordered, qty_received, unit_cost FROM public.purchase_order_lines WHERE purchase_id = (SELECT id FROM public.purchases WHERE purchase_no = 'PO-20260104-0001');

-- Check Receipts
SELECT pr.receipt_no, pr.total_amount, prl.received_qty, prl.unit_cost 
FROM public.purchase_receipts pr
JOIN public.purchase_receipt_lines prl ON prl.receipt_id = pr.id
WHERE pr.purchase_id = (SELECT id FROM public.purchases WHERE purchase_no = 'PO-20260104-0001');

-- Check Returns
SELECT pr.return_no, pr.status, prl.qty, pol.unit_cost
FROM public.purchase_returns pr
JOIN public.purchase_return_lines prl ON prl.return_id = pr.id
JOIN public.purchase_order_lines pol ON pol.id = prl.purchase_line_id
WHERE pr.purchase_id = (SELECT id FROM public.purchases WHERE purchase_no = 'PO-20260104-0001');
