SELECT * FROM journal_entries WHERE reference_id = (SELECT id FROM purchases WHERE purchase_no = 'PO-20260104-0003');
