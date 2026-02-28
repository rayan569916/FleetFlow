from flask import Blueprint, jsonify, request
from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.finance import Payment, Receipt, Purchase
from models.shipment import Shipment
from models.fleet import Driver
from services.dashboard_services import DashboardService
from utils.auth import role_required, get_effective_read_office_id, validate_office_id
import datetime
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_stats(current_user):
    period = request.args.get('period', 'today')
    requested_office_id = request.args.get('office_id', type=int)
    office_id = get_effective_read_office_id(current_user, requested_office_id)
    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name not in ['Super_admin', 'management']:
        return jsonify({'message': 'User is not assigned to an office'}), 403
    
    # Calculated stats based on real models
    invoices_query = InvoiceHeader.query
    revenue_query = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).join(InvoiceHeader)
    drivers_query = Driver.query.filter_by(status='Active')
    shipments_query = Shipment.query.filter(Shipment.status != 'Delivered')

    if office_id is not None:
        invoices_query = invoices_query.filter(InvoiceHeader.office_id == office_id)
        revenue_query = revenue_query.filter(InvoiceHeader.office_id == office_id)
        drivers_query = drivers_query.filter(Driver.office_id == office_id)
        shipments_query = shipments_query.filter(Shipment.office_id == office_id)

    total_invoices = invoices_query.count()
    total_revenue = revenue_query.scalar() or 0
    active_drivers = drivers_query.count()
    pending_shipments = shipments_query.count()

    return jsonify({
        'revenue': float(total_revenue),
        'expenses': float(total_revenue * 0.6), # Mock expense calculation
        'profit': float(total_revenue * 0.4),
        'growth': 15.3, # Mock growth
        'active_drivers': active_drivers,
        'pending_shipments': pending_shipments,
        'total_invoices': total_invoices
    })

@dashboard_bp.route('/recent-activity', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_recent_activity(current_user):
    requested_office_id = request.args.get('office_id', type=int)
    office_id = get_effective_read_office_id(current_user, requested_office_id)
    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name not in ['Super_admin', 'management']:
        return jsonify({'message': 'User is not assigned to an office'}), 403

    # Fetch recent invoices and shipments as activity
    invoices_query = InvoiceHeader.query
    payment_query = Payment.query
    purchase_query = Purchase.query
    receipt_query = Receipt.query

    if office_id is not None:
        invoices_query = invoices_query.filter(InvoiceHeader.office_id == office_id)
        payment_query = payment_query.filter(Payment.office_id == office_id)
        purchase_query = purchase_query.filter(Purchase.office_id == office_id)
        receipt_query = receipt_query.filter(Receipt.office_id == office_id)

    recent_invoices = invoices_query.order_by(InvoiceHeader.created_at.desc()).limit(5).all()
    recent_payment = payment_query.order_by(Payment.created_at.desc()).limit(5).all()
    recent_purchase = purchase_query.order_by(Purchase.created_at.desc()).limit(5).all()
    recent_receipt = receipt_query.order_by(Receipt.created_at.desc()).limit(5).all()
    
    activity = []
    for inv in recent_invoices:
        activity.append({
            'id': inv.id,
            'type': 'invoice',
            'title': f'Invoice {inv.invoice_number} generated',
            'timestamp': inv.created_at.isoformat(),
            'user': inv.creator.full_name if inv.creator else 'System',
            'status': inv.status
        })

    for pay in recent_payment:
        activity.append({
            'id': pay.id,
            'type': 'payment',
            'title': f'Payment {DashboardService.det_category_name(pay.category_id,"payments")} generated',
            'timestamp': pay.created_at.isoformat(),
            'user': 'System',
            'status': "completed"
        })

    for pur in recent_purchase:
        activity.append({
            'id': pur.id,
            'type': 'purchase',
            'title': f'Purchase {DashboardService.det_category_name(pur.category_id,"purchases")} generated',
            'timestamp': pur.created_at.isoformat(),
            'user': 'System',
            'status': "completed"
        })

    for rec in recent_receipt:
        activity.append({
            'id': rec.id,
            'type': 'receipt',
            'title': f'Receipt {DashboardService.det_category_name(rec.category_id,"receipts")} generated',
            'timestamp': rec.created_at.isoformat(),
            'user': 'System',
            'status': "completed"
        })

    activity.sort(key=lambda x: x['timestamp'], reverse=True) 
    return jsonify(activity)

@dashboard_bp.route('/trends', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_trends(current_user):
    # Mock trend data for charts
    trends = [
        {'date': '2026-01', 'value': 45000},
        {'date': '2026-02', 'value': 52000},
        {'date': '2026-03', 'value': 48000},
        {'date': '2026-04', 'value': 61000},
        {'date': '2026-05', 'value': 55000},
        {'date': '2026-06', 'value': 67000}
    ]
    return jsonify(trends)
