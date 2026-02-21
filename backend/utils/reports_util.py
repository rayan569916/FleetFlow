from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.finance import Purchase, Receipt, Payment, DailyReport
import datetime
from sqlalchemy import func

def update_daily_report(target_date):
    """
    Recalculates and updates (or creates) the DailyReport for a specific date.
    """
    if isinstance(target_date, datetime.datetime):
        target_date = target_date.date()
    
    # 1. Calculate totals
    # Total Invoices Grand Total
    total_invoice_grand = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
        join(InvoiceHeader).\
        filter(InvoiceHeader.date == target_date).scalar() or 0.0

    # Bank Transfer & Swipe Sum
    bank_transfer_swipe_sum = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
        join(InvoiceHeader).\
        filter(InvoiceHeader.date == target_date).\
        filter(InvoiceHeader.mode_of_payment.in_(['bank_transfer', 'swipe'])).scalar() or 0.0

    # Total Payments
    total_payment = db.session.query(func.sum(Payment.amount)).\
        filter(func.date(Payment.created_at) == target_date).scalar() or 0.0

    # Total Purchases
    total_purchase = db.session.query(func.sum(Purchase.amount)).\
        filter(func.date(Purchase.created_at) == target_date).scalar() or 0.0

    # Total Receipts
    total_receipt = db.session.query(func.sum(Receipt.amount)).\
        filter(func.date(Receipt.created_at) == target_date).scalar() or 0.0

    # Previous Total
    previous_date = target_date - datetime.timedelta(days=1)
    previous_report = DailyReport.query.filter_by(date=previous_date).first()
    previous_total = previous_report.daily_total if previous_report else 0.0

    # Formula: (total_invoice_grand - bank_transfer_swipe_sum - total_payment - total_purchase + total_receipt + previous_total)
    daily_total = (total_invoice_grand - bank_transfer_swipe_sum - total_payment - total_purchase + total_receipt + previous_total)

    # 2. Update or Create
    report = DailyReport.query.filter_by(date=target_date).first()
    if report:
        report.total_invoice_grand = total_invoice_grand
        report.bank_transfer_swipe_sum = bank_transfer_swipe_sum
        report.total_payment = total_payment
        report.total_purchase = total_purchase
        report.total_receipt = total_receipt
        report.previous_total = previous_total
        report.daily_total = daily_total
    else:
        report = DailyReport(
            date=target_date,
            total_invoice_grand=total_invoice_grand,
            bank_transfer_swipe_sum=bank_transfer_swipe_sum,
            total_payment=total_payment,
            total_purchase=total_purchase,
            total_receipt=total_receipt,
            previous_total=previous_total,
            daily_total=daily_total
        )
        db.session.add(report)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating daily report for {target_date}: {str(e)}")
