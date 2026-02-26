-- Run this query TWICE to handle cascading carry-forwards.
-- First run: fixes Feb 24 (using Feb 21's daily_total)
-- Second run: fixes Feb 25 (now using Feb 24's corrected daily_total)
set sql_safe_updates=0;
UPDATE daily_reports dr
INNER JOIN (
    SELECT 
        dr1.id,
        dr1.total_invoice_grand,
        dr1.bank_transfer_swipe_sum,
        dr1.total_payment,
        dr1.total_purchase,
        dr1.total_receipt,
        COALESCE((
            SELECT dr2.daily_total 
            FROM daily_reports dr2 
            WHERE dr2.office_id = dr1.office_id 
              AND dr2.date < dr1.date 
            ORDER BY dr2.date DESC 
            LIMIT 1
        ), 0) AS computed_previous
    FROM daily_reports dr1
) AS calc ON dr.id = calc.id
SET 
    dr.previous_total = calc.computed_previous,
    dr.daily_total     = calc.total_invoice_grand
                       - calc.bank_transfer_swipe_sum
                       - calc.total_payment
                       - calc.total_purchase
                       + calc.total_receipt
                       + calc.computed_previous;
set sql_safe_updates=1;