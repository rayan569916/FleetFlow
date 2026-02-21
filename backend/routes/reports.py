from flask import Blueprint, request, jsonify
from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.finance import Purchase, Receipt, Payment, DailyReport
from utils.auth import role_required
import datetime
from sqlalchemy import func

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/daily', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_daily_report(current_user):
    date_str = request.args.get('date')
    if date_str:
        target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        target_date = datetime.date.today()

    # 1. Check if report already exists in database
    existing_report = DailyReport.query.filter_by(date=target_date).first()
    if existing_report:
        return jsonify({
            'date': str(existing_report.date),
            'total_invoice_grand': existing_report.total_invoice_grand,
            'bank_transfer_swipe_sum': existing_report.bank_transfer_swipe_sum,
            'total_payment': existing_report.total_payment,
            'total_purchase': existing_report.total_purchase,
            'total_receipt': existing_report.total_receipt,
            'previous_total': existing_report.previous_total,
            'daily_total': existing_report.daily_total,
            'is_stored': True
        })

    # 2. Calculate calculations for the day if not stored
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

    return jsonify({
        'date': str(target_date),
        'total_invoice_grand': total_invoice_grand,
        'bank_transfer_swipe_sum': bank_transfer_swipe_sum,
        'total_payment': total_payment,
        'total_purchase': total_purchase,
        'total_receipt': total_receipt,
        'previous_total': previous_total,
        'daily_total': daily_total,
        'is_stored': False
    })

@reports_bp.route('/daily/save', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def save_daily_report(current_user):
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({'message': 'Missing date'}), 400
    
    target_date = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()
    
    # Check if already exists
    existing_report = DailyReport.query.filter_by(date=target_date).first()
    if existing_report:
        # Update existing
        existing_report.total_invoice_grand = data.get('total_invoice_grand', 0.0)
        existing_report.bank_transfer_swipe_sum = data.get('bank_transfer_swipe_sum', 0.0)
        existing_report.total_payment = data.get('total_payment', 0.0)
        existing_report.total_purchase = data.get('total_purchase', 0.0)
        existing_report.total_receipt = data.get('total_receipt', 0.0)
        existing_report.previous_total = data.get('previous_total', 0.0)
        existing_report.daily_total = data.get('daily_total', 0.0)
    else:
        # Create new
        new_report = DailyReport(
            date=target_date,
            total_invoice_grand=data.get('total_invoice_grand', 0.0),
            bank_transfer_swipe_sum=data.get('bank_transfer_swipe_sum', 0.0),
            total_payment=data.get('total_payment', 0.0),
            total_purchase=data.get('total_purchase', 0.0),
            total_receipt=data.get('total_receipt', 0.0),
            previous_total=data.get('previous_total', 0.0),
            daily_total=data.get('daily_total', 0.0)
        )
        db.session.add(new_report)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Daily report saved successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to save report', 'error': str(e)}), 500
