-- ========================================================
-- SALES ORDER PAYMENTS VIEW
-- ========================================================

CREATE OR REPLACE VIEW v_sales_order_payments AS
SELECT
  so.id,
  so.customer_id,
  so.desty_order_no,
  so.order_date,
  so.status,
  so.total_amount,
  COALESCE(SUM(cpa.allocated_amount), 0)::DECIMAL(12,2) AS paid_amount,
  GREATEST(
    COALESCE(so.total_amount, 0) - COALESCE(SUM(cpa.allocated_amount), 0),
    0
  )::DECIMAL(12,2) AS outstanding_amount,
  CASE
    WHEN COALESCE(SUM(cpa.allocated_amount), 0) = 0 THEN 'unpaid'
    WHEN COALESCE(SUM(cpa.allocated_amount), 0) < COALESCE(so.total_amount, 0) THEN 'partial'
    ELSE 'paid'
  END AS payment_status
FROM sales_orders so
LEFT JOIN customer_payment_allocations cpa
  ON cpa.sales_order_id = so.id
GROUP BY so.id;

COMMENT ON VIEW v_sales_order_payments IS
'Aggregated sales order payment totals based on customer payment allocations.';
