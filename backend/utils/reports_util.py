from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.finance import Purchase, Receipt, Payment, DailyReport
import datetime
from sqlalchemy import func

NON_CASH_PAYMENT_MODES = [
    # Canonical values used by the frontend
    'Direct Bank Transfer',
    'bank_transfer',
    'swipe',
    # Common legacy/human-readable variants (keep lower-case here)
    'bank transfer',
    'direct bank transfer',
    'direct_bank_transfer',
]

def _non_cash_payment_mode_filter():
    """
    Returns a SQLAlchemy filter for InvoiceHeader.mode_of_payment matching
    Swipe/Direct Bank Transfer, tolerant to case/legacy strings.
    """
    return func.lower(InvoiceHeader.mode_of_payment).in_(NON_CASH_PAYMENT_MODES)

def _as_date(d):
    if isinstance(d, datetime.datetime):
        return d.date()
    return d

def update_daily_report(target_date, office_id):
    """
    Recalculates and updates (or creates) the DailyReport for a specific date and office.
    """
    target_date = _as_date(target_date)
    
    # 1. Calculate totals
    # Total Invoices Grand Total
    total_invoice_grand = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
        join(InvoiceHeader).\
        filter(InvoiceHeader.date == target_date).\
        filter(InvoiceHeader.office_id == office_id).scalar() or 0.0

    # Bank Transfer & Swipe Sum
    bank_transfer_swipe_sum = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
        join(InvoiceHeader).\
        filter(InvoiceHeader.date == target_date).\
        filter(InvoiceHeader.office_id == office_id).\
        filter(_non_cash_payment_mode_filter()).scalar() or 0.0

    # Total Payments
    total_payment = db.session.query(func.sum(Payment.amount)).\
        filter(func.date(Payment.created_at) == target_date).\
        filter(Payment.office_id == office_id).scalar() or 0.0

    # Total Purchases
    total_purchase = db.session.query(func.sum(Purchase.amount)).\
        filter(func.date(Purchase.created_at) == target_date).\
        filter(Purchase.office_id == office_id).scalar() or 0.0

    # Total Receipts
    total_receipt = db.session.query(func.sum(Receipt.amount)).\
        filter(func.date(Receipt.created_at) == target_date).\
        filter(Receipt.office_id == office_id).scalar() or 0.0

    # Previous Total
    # Use the most recent available report before target_date (not necessarily "yesterday"),
    # otherwise missing days would incorrectly reset the running balance.
    previous_report = DailyReport.query.filter(
        DailyReport.office_id == office_id,
        DailyReport.date < target_date
    ).order_by(DailyReport.date.desc()).first()
    previous_total = previous_report.daily_total if previous_report else 0.0

    # Formula: (total_invoice_grand - bank_transfer_swipe_sum - total_payment - total_purchase + total_receipt + previous_total)
    daily_total = (total_invoice_grand - bank_transfer_swipe_sum - total_payment - total_purchase + total_receipt + previous_total)

    # 2. Update or Create
    report = DailyReport.query.filter_by(date=target_date, office_id=office_id).first()
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
            office_id=office_id,
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

def recalculate_daily_reports_range(start_date, end_date, office_id):
    """
    Recalculate (and persist) DailyReport rows for an office in a date range.

    This fixes historically incorrect `previous_total` / `daily_total` values by
    computing day-by-day in chronological order using:
      daily_total = total_invoice_grand - bank_transfer_swipe_sum - total_payment
                    - total_purchase + total_receipt + previous_total

    Note: `previous_total` is derived from the most recent stored report BEFORE
    start_date. If that earlier report is wrong, you must recalc from an earlier date.
    """
    start_date = _as_date(start_date)
    end_date = _as_date(end_date)
    if start_date is None or end_date is None:
        raise ValueError("start_date and end_date are required")
    if start_date > end_date:
        raise ValueError("start_date cannot be after end_date")

    previous_report = DailyReport.query.filter(
        DailyReport.office_id == office_id,
        DailyReport.date < start_date
    ).order_by(DailyReport.date.desc()).first()
    running_prev_total = previous_report.daily_total if previous_report else 0.0

    updated = 0
    current_date = start_date
    while current_date <= end_date:
        total_invoice_grand = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
            join(InvoiceHeader).\
            filter(InvoiceHeader.date == current_date).\
            filter(InvoiceHeader.office_id == office_id).scalar() or 0.0

        bank_transfer_swipe_sum = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
            join(InvoiceHeader).\
            filter(InvoiceHeader.date == current_date).\
            filter(InvoiceHeader.office_id == office_id).\
            filter(_non_cash_payment_mode_filter()).scalar() or 0.0

        total_payment = db.session.query(func.sum(Payment.amount)).\
            filter(func.date(Payment.created_at) == current_date).\
            filter(Payment.office_id == office_id).scalar() or 0.0

        total_purchase = db.session.query(func.sum(Purchase.amount)).\
            filter(func.date(Purchase.created_at) == current_date).\
            filter(Purchase.office_id == office_id).scalar() or 0.0

        total_receipt = db.session.query(func.sum(Receipt.amount)).\
            filter(func.date(Receipt.created_at) == current_date).\
            filter(Receipt.office_id == office_id).scalar() or 0.0

        daily_total = (
            total_invoice_grand
            - bank_transfer_swipe_sum
            - total_payment
            - total_purchase
            + total_receipt
            + running_prev_total
        )

        report = DailyReport.query.filter_by(date=current_date, office_id=office_id).first()
        if report:
            report.total_invoice_grand = total_invoice_grand
            report.bank_transfer_swipe_sum = bank_transfer_swipe_sum
            report.total_payment = total_payment
            report.total_purchase = total_purchase
            report.total_receipt = total_receipt
            report.previous_total = running_prev_total
            report.daily_total = daily_total
        else:
            report = DailyReport(
                date=current_date,
                office_id=office_id,
                total_invoice_grand=total_invoice_grand,
                bank_transfer_swipe_sum=bank_transfer_swipe_sum,
                total_payment=total_payment,
                total_purchase=total_purchase,
                total_receipt=total_receipt,
                previous_total=running_prev_total,
                daily_total=daily_total
            )
            db.session.add(report)

        updated += 1
        running_prev_total = daily_total
        current_date += datetime.timedelta(days=1)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        'office_id': office_id,
        'start_date': str(start_date),
        'end_date': str(end_date),
        'updated_days': updated
    }
